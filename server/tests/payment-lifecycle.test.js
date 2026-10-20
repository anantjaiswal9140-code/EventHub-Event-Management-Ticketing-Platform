import 'dotenv/config';
import assert from 'node:assert/strict';
import crypto, { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import {
  getTestCheckoutSession,
  setTestCheckoutStatus,
} from '../src/services/test-payment-provider.js';

process.env.JWT_ACCESS_SECRET ||= 'payment-lifecycle-test-access-secret';
process.env.PAYMENT_WEBHOOK_SECRET ||= 'payment-lifecycle-test-webhook-secret';
process.env.PAYMENT_PROVIDER_MODE = 'test';

test(
  'payment checkout, webhook, and reconciliation lifecycle',
  {
    skip:
      !process.env.DATABASE_URL &&
      'DATABASE_URL is required for payment lifecycle integration tests.',
  },
  async (t) => {
    const [{ default: app }, { prisma }] = await Promise.all([
      import('../src/app.js'),
      import('../src/db.js'),
    ]);
    const server = createServer(app);
    const createdEventIds = [];
    const createdBookingIds = [];
    const createdUserIds = [];
    const webhookEventIds = [];

    t.after(async () => {
      const cleanupErrors = [];
      const cleanup = async (operation) => {
        try {
          await operation();
        } catch (error) {
          cleanupErrors.push(error);
        }
      };

      if (webhookEventIds.length > 0) {
        await cleanup(() =>
          prisma.processedWebhook.deleteMany({
            where: {
              provider: 'razorpay',
              providerEventId: { in: webhookEventIds },
            },
          })
        );
      }
      if (createdEventIds.length > 0) {
        await cleanup(() =>
          prisma.payment.deleteMany({
            where: { booking: { eventId: { in: createdEventIds } } },
          })
        );
        await cleanup(() =>
          prisma.booking.deleteMany({
            where: { eventId: { in: createdEventIds } },
          })
        );
      }
      if (createdEventIds.length > 0) {
        await cleanup(() =>
          prisma.event.deleteMany({
            where: { id: { in: createdEventIds } },
          })
        );
      }
      if (createdUserIds.length > 0) {
        await cleanup(() =>
          prisma.user.deleteMany({
            where: { id: { in: createdUserIds } },
          })
        );
      }
      if (server.listening) {
        await cleanup(
          () =>
            new Promise((resolve, reject) =>
              server.close((error) => (error ? reject(error) : resolve()))
            )
        );
      }
      await cleanup(() => prisma.$disconnect());

      if (cleanupErrors.length > 0) {
        throw new AggregateError(cleanupErrors, 'Payment test cleanup failed.');
      }
    });

    await prisma.$connect();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const organizer = await prisma.user.create({
      data: {
        name: 'Payment Lifecycle Organizer',
        email: `payment-organizer-${randomUUID()}@example.test`,
        passwordHash: 'not-used',
        role: 'ORGANIZER',
      },
    });
    createdUserIds.push(organizer.id);
    const attendee = await prisma.user.create({
      data: {
        name: 'Payment Lifecycle Attendee',
        email: `payment-attendee-${randomUUID()}@example.test`,
        passwordHash: 'not-used',
      },
    });
    createdUserIds.push(attendee.id);
    const otherAttendee = await prisma.user.create({
      data: {
        name: 'Other Payment Lifecycle Attendee',
        email: `payment-attendee-${randomUUID()}@example.test`,
        passwordHash: 'not-used',
      },
    });
    createdUserIds.push(otherAttendee.id);

    function tokenFor(userId) {
      return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
        expiresIn: '5m',
      });
    }

    function authenticatedPost(path, userId, body) {
      return fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `accessToken=${tokenFor(userId)}`,
        },
        body: JSON.stringify(body ?? {}),
      });
    }

    async function createEvent() {
      const startAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const event = await prisma.event.create({
        data: {
          organizerId: organizer.id,
          title: `Payment lifecycle ${randomUUID()}`,
          description: 'Payment lifecycle integration test.',
          category: 'Test',
          venue: 'Test venue',
          address: '1 Test Street',
          city: 'Test City',
          timezone: 'UTC',
          startAt,
          endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
          registrationClosesAt: new Date(startAt.getTime() - 60 * 60 * 1000),
          capacity: 5,
          priceMinor: 3499,
          currency: 'INR',
          status: 'PUBLISHED',
        },
      });
      createdEventIds.push(event.id);
      return event;
    }

    async function reserveAndCheckout(userId = attendee.id) {
      const event = await createEvent();
      const reserveResponse = await authenticatedPost(
        `/api/events/${event.id}/bookings/paid`,
        userId
      );
      assert.equal(reserveResponse.status, 201);
      const reservation = (await reserveResponse.json()).data;
      createdBookingIds.push(reservation.booking.id);

      const checkoutResponse = await authenticatedPost(
        `/api/bookings/${reservation.booking.id}/checkout`,
        userId
      );
      assert.equal(checkoutResponse.status, 200);

      return {
        event,
        booking: reservation.booking,
        payment: reservation.payment,
        checkout: (await checkoutResponse.json()).data.checkout,
      };
    }

    async function postWebhook(payload, signatureOverride) {
      const rawBody = Buffer.from(JSON.stringify(payload));
      const signature =
        signatureOverride ??
        `sha256=${crypto
          .createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET)
          .update(rawBody)
          .digest('hex')}`;
      const response = await fetch(`${baseUrl}/api/payments/webhook`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-payment-signature': signature,
        },
        body: rawBody,
      });
      return { response, payload };
    }

    async function sendWebhook(checkoutId, status, signatureOverride) {
      const payload = {
        eventId: `evt_${randomUUID()}`,
        checkoutId,
        status,
        providerPaymentId:
          status === 'PAID' ? `pay_${randomUUID()}` : undefined,
      };
      webhookEventIds.push(payload.eventId);
      return postWebhook(payload, signatureOverride);
    }

    await t.test(
      'checkout is owner-only and reuses a database-priced provider session',
      async () => {
        const { booking, payment, checkout } = await reserveAndCheckout();
        const repeated = await authenticatedPost(
          `/api/bookings/${booking.id}/checkout`,
          attendee.id
        );
        const repeatedBody = await repeated.json();

        assert.equal(repeated.status, 200);
        assert.equal(repeatedBody.data.checkout.id, checkout.id);
        const providerSession = getTestCheckoutSession(checkout.id);
        assert.equal(providerSession.amountMinor, payment.amountMinor);
        assert.equal(providerSession.currency, payment.currency);
        assert.equal(
          (await prisma.payment.findUnique({ where: { id: payment.id } }))
            .providerCheckoutId,
          checkout.id
        );

        const unauthorizedOwner = await authenticatedPost(
          `/api/bookings/${booking.id}/checkout`,
          otherAttendee.id
        );
        assert.equal(unauthorizedOwner.status, 404);
      }
    );

    await t.test(
      'verified successful payment confirms booking and issues ticket',
      async () => {
        const { booking, checkout } = await reserveAndCheckout();
        const { response } = await sendWebhook(checkout.id, 'PAID');
        const responseBody = await response.json();
        const persisted = await prisma.booking.findUnique({
          where: { id: booking.id },
          include: { payment: true },
        });

        assert.equal(response.status, 200);
        assert.equal(responseBody.data.duplicate, false);
        assert.equal(persisted.status, 'CONFIRMED');
        assert.ok(persisted.ticketCode);
        assert.equal(persisted.payment.status, 'PAID');
        assert.ok(persisted.payment.providerPaymentId);
      }
    );

    await t.test(
      'failed payment expires booking without issuing ticket',
      async () => {
        const { booking, checkout } = await reserveAndCheckout();
        const { response } = await sendWebhook(checkout.id, 'FAILED');
        const persisted = await prisma.booking.findUnique({
          where: { id: booking.id },
          include: { payment: true },
        });

        assert.equal(response.status, 200);
        assert.equal(persisted.status, 'EXPIRED');
        assert.equal(persisted.ticketCode, null);
        assert.equal(persisted.payment.status, 'EXPIRED');
      }
    );

    await t.test(
      'rejects invalid webhook signatures without changing payment state',
      async () => {
        const { booking, checkout } = await reserveAndCheckout();
        const { response, payload } = await sendWebhook(
          checkout.id,
          'PAID',
          'sha256=invalid'
        );
        const body = await response.json();
        const persisted = await prisma.booking.findUnique({
          where: { id: booking.id },
          include: { payment: true },
        });

        assert.equal(response.status, 401);
        assert.equal(body.error.code, 'INVALID_WEBHOOK_SIGNATURE');
        assert.equal(persisted.status, 'PENDING_PAYMENT');
        assert.equal(persisted.ticketCode, null);
        assert.equal(persisted.payment.status, 'OPEN');
        assert.equal(
          await prisma.processedWebhook.count({
            where: {
              provider: 'razorpay',
              providerEventId: payload.eventId,
            },
          }),
          0
        );
      }
    );

    await t.test(
      'repeated webhook delivery preserves the original ticket',
      async () => {
        const { booking, checkout } = await reserveAndCheckout();
        const payload = {
          eventId: `evt_${randomUUID()}`,
          checkoutId: checkout.id,
          status: 'PAID',
          providerPaymentId: `pay_${randomUUID()}`,
        };
        webhookEventIds.push(payload.eventId);
        const [first, repeated] = await Promise.all([
          postWebhook(payload),
          postWebhook(payload),
        ]);
        const firstBody = await first.response.json();
        const repeatedBody = await repeated.response.json();
        const persisted = await prisma.booking.findUnique({
          where: { id: booking.id },
        });

        assert.deepEqual(
          [first.response.status, repeated.response.status],
          [200, 200]
        );
        assert.deepEqual(
          [firstBody.data.duplicate, repeatedBody.data.duplicate].sort(),
          [false, true]
        );
        assert.ok(persisted.ticketCode);
        assert.equal(
          await prisma.processedWebhook.count({
            where: {
              provider: 'razorpay',
              providerEventId: first.payload.eventId,
            },
          }),
          1
        );
      }
    );

    await t.test(
      'reconciliation applies the provider current status',
      async () => {
        const { booking, checkout } = await reserveAndCheckout();
        setTestCheckoutStatus(checkout.id, 'PAID');

        const response = await authenticatedPost(
          `/api/bookings/${booking.id}/reconcile`,
          attendee.id
        );
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.data.booking.status, 'CONFIRMED');
        assert.ok(body.data.booking.ticketCode);
        assert.equal(body.data.payment.status, 'PAID');
      }
    );

    await t.test(
      'late successful payment requires refund and never issues ticket',
      async () => {
        const { booking, checkout } = await reserveAndCheckout();
        await prisma.booking.update({
          where: { id: booking.id },
          data: { holdExpiresAt: new Date(Date.now() - 1000) },
        });

        const { response } = await sendWebhook(checkout.id, 'PAID');
        const persisted = await prisma.booking.findUnique({
          where: { id: booking.id },
          include: { payment: true },
        });

        assert.equal(response.status, 200);
        assert.equal(persisted.status, 'REFUND_REQUIRED');
        assert.equal(persisted.ticketCode, null);
        assert.equal(persisted.payment.status, 'REFUND_REQUIRED');
      }
    );
  }
);

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  fetchHomepageEvents,
  formatHomepageEvent,
  getCategoryPath,
  getEventSearchPath,
  getHomepageSectionState,
  homepageEventRequests,
} from '../src/pages/landingEvents.js';

const event = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Community Concert',
  description: 'An evening of live music.',
  category: 'Music',
  startAt: '2026-12-24T18:00:00.000Z',
  venue: 'City Hall',
  city: 'Pune',
  priceMinor: 125050,
  currency: 'INR',
  coverKey: 'private-storage-key',
};

test('homepage event cards use API data and safe fallback imagery', async () => {
  const request = async (path) => {
    assert.equal(path, homepageEventRequests.upcoming);
    return { data: [event], pagination: { total: 1 } };
  };

  const events = await fetchHomepageEvents(
    request,
    homepageEventRequests.upcoming
  );
  const card = formatHomepageEvent(events[0]);

  assert.equal(events[0].title, 'Community Concert');
  assert.equal(card.category, 'Music');
  assert.equal(card.date, '24 Dec 2026');
  assert.equal(card.location, 'City Hall, Pune');
  assert.equal(card.price, 'From ₹1,250.50');
  assert.notEqual(card.image, event.coverKey);
});

test('zero-priced events display Free', () => {
  assert.equal(formatHomepageEvent({ ...event, priceMinor: 0 }).price, 'Free');
});

test('event detail links preserve API UUIDs', () => {
  assert.equal(
    formatHomepageEvent(event).href,
    '/events/550e8400-e29b-41d4-a716-446655440000'
  );
});

test('free and paid sections request their corresponding API filters', async () => {
  assert.equal(homepageEventRequests.free, '/events?pricing=free&limit=8');
  assert.equal(homepageEventRequests.paid, '/events?pricing=paid&limit=8');

  const requestedPaths = [];
  const request = async (path) => {
    requestedPaths.push(path);
    return { data: [], pagination: { total: 0 } };
  };

  await fetchHomepageEvents(request, homepageEventRequests.free);
  await fetchHomepageEvents(request, homepageEventRequests.paid);
  assert.deepEqual(requestedPaths, [
    '/events?pricing=free&limit=8',
    '/events?pricing=paid&limit=8',
  ]);
});

test('search and category navigation encode query values', () => {
  assert.equal(
    getEventSearchPath('  live music & art  '),
    '/events?q=live+music+%26+art'
  );
  assert.equal(getEventSearchPath('  '), '/events');
  assert.equal(getCategoryPath('All Events'), '/events');
  assert.equal(
    getCategoryPath('Tech & Business'),
    '/events?category=Tech+%26+Business'
  );
});

test('event sections expose loading and useful empty states', () => {
  assert.equal(
    getHomepageSectionState({ loading: true, error: '', events: [] }),
    'loading'
  );
  assert.equal(
    getHomepageSectionState({
      loading: false,
      error: 'Service unavailable',
      events: [],
    }),
    'error'
  );
  assert.equal(
    getHomepageSectionState({ loading: false, error: '', events: [] }),
    'empty'
  );
  assert.equal(
    getHomepageSectionState({ loading: false, error: '', events: [event] }),
    'events'
  );
});

test('failed event requests can be issued again for Retry', async () => {
  let attempts = 0;
  const request = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('Service unavailable');
    return { data: [event], pagination: { total: 1 } };
  };

  await assert.rejects(
    fetchHomepageEvents(request, homepageEventRequests.upcoming),
    /Service unavailable/
  );
  const events = await fetchHomepageEvents(
    request,
    homepageEventRequests.upcoming
  );

  assert.equal(attempts, 2);
  assert.equal(events[0].id, event.id);
});

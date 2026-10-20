import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createEvent,
  updateEvent,
  publishEvent,
  checkInTicket,
  listEvents,
  getEvent,
  deleteEvent,
  cancelEvent,
  listAttendees,
} from '../controllers/organizer.controller.js';

const router = Router();

router.use(requireAuth, requireRole('ORGANIZER'));

router.get('/events', listEvents);
router.post('/events', createEvent);

router.get('/events/:id', getEvent);
router.patch('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);

router.post('/events/:id/publish', publishEvent);
router.post('/events/:id/cancel', cancelEvent);
router.get('/events/:id/attendees', listAttendees);

router.post('/events/:eventId/check-ins', checkInTicket);

export default router;

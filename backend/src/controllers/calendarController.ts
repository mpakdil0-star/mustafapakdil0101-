import { Request, Response } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';

// GET /calendar — List events (with optional month/year filter)
export const getEvents = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { month, year } = req.query;

    let dateFilter: any = {};
    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
      dateFilter = {
        eventDate: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    const events = await prisma.calendarEvent.findMany({
      where: {
        userId,
        ...dateFilter,
      },
      orderBy: { eventDate: 'asc' },
    });

    res.json({ success: true, data: events });
  } catch (error: any) {
    logger.error('Calendar getEvents error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// POST /calendar — Create event
export const createEvent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { title, note, eventDate, eventTime, hasReminder, reminderAt, amount, addToLedger } = req.body;

    if (!title || !eventDate) {
      return res.status(400).json({ success: false, error: { message: 'Başlık ve tarih zorunludur.' } });
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId,
        title,
        note: note || null,
        eventDate: new Date(eventDate),
        eventTime: eventTime || null,
        hasReminder: hasReminder || false,
        reminderAt: reminderAt ? new Date(reminderAt) : null,
        amount: amount ? parseFloat(amount) : null,
      },
    });

    // If addToLedger is true and amount exists, create a ledger entry
    if (addToLedger && amount) {
      await prisma.ledgerEntry.create({
        data: {
          userId,
          personName: title,
          amount: parseFloat(amount),
          type: 'receivable',
          status: 'pending',
          note: note || null,
          dueDate: new Date(eventDate),
          calendarEventId: event.id,
        },
      });
    }

    res.status(201).json({ success: true, data: event });
  } catch (error: any) {
    logger.error('Calendar createEvent error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// PUT /calendar/:id — Update event
export const updateEvent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { title, note, eventDate, eventTime, hasReminder, reminderAt, amount, status } = req.body;

    // Verify ownership
    const existing = await prisma.calendarEvent.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Etkinlik bulunamadı.' } });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (note !== undefined) updateData.note = note;
    if (eventDate !== undefined) updateData.eventDate = new Date(eventDate);
    if (eventTime !== undefined) updateData.eventTime = eventTime;
    if (hasReminder !== undefined) updateData.hasReminder = hasReminder;
    if (reminderAt !== undefined) updateData.reminderAt = reminderAt ? new Date(reminderAt) : null;
    if (amount !== undefined) updateData.amount = amount ? parseFloat(amount) : null;
    if (status !== undefined) updateData.status = status;

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: event });
  } catch (error: any) {
    logger.error('Calendar updateEvent error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// PUT /calendar/:id/complete — Mark event as completed
export const completeEvent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { addToLedger } = req.body;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Etkinlik bulunamadı.' } });
    }

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: { status: 'completed' },
    });

    // If requested and amount exists, create ledger entry
    if (addToLedger && existing.amount) {
      await prisma.ledgerEntry.create({
        data: {
          userId,
          personName: existing.title,
          amount: existing.amount,
          type: 'receivable',
          status: 'pending',
          note: existing.note || null,
          dueDate: existing.eventDate,
          calendarEventId: existing.id,
        },
      });
    }

    res.json({ success: true, data: event });
  } catch (error: any) {
    logger.error('Calendar completeEvent error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// DELETE /calendar/:id — Delete event
export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Etkinlik bulunamadı.' } });
    }

    await prisma.calendarEvent.delete({ where: { id } });

    res.json({ success: true, message: 'Etkinlik silindi.' });
  } catch (error: any) {
    logger.error('Calendar deleteEvent error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

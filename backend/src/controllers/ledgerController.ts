import { Request, Response } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';

// GET /ledger — List entries (with optional type/status filter)
export const getEntries = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { type, status } = req.query;

    const where: any = { userId };
    if (type) where.type = type;
    if (status) where.status = status;

    const entries = await prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: entries });
  } catch (error: any) {
    logger.error('Ledger getEntries error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// GET /ledger/summary — Totals
export const getSummary = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const receivables = await prisma.ledgerEntry.aggregate({
      where: { userId, type: 'receivable', status: 'pending' },
      _sum: { amount: true },
    });

    const payables = await prisma.ledgerEntry.aggregate({
      where: { userId, type: 'payable', status: 'pending' },
      _sum: { amount: true },
    });

    const totalReceived = await prisma.ledgerEntry.aggregate({
      where: { userId, type: 'receivable', status: 'paid' },
      _sum: { amount: true },
    });

    const totalPaid = await prisma.ledgerEntry.aggregate({
      where: { userId, type: 'payable', status: 'paid' },
      _sum: { amount: true },
    });

    res.json({
      success: true,
      data: {
        pendingReceivables: Number(receivables._sum.amount || 0),
        pendingPayables: Number(payables._sum.amount || 0),
        totalReceived: Number(totalReceived._sum.amount || 0),
        totalPaid: Number(totalPaid._sum.amount || 0),
        netBalance: Number(receivables._sum.amount || 0) - Number(payables._sum.amount || 0),
      },
    });
  } catch (error: any) {
    logger.error('Ledger getSummary error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// POST /ledger — Create entry
export const createEntry = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { personName, amount, type, note, dueDate } = req.body;

    if (!personName || !amount || !type) {
      return res.status(400).json({
        success: false,
        error: { message: 'Kişi adı, tutar ve tür zorunludur.' },
      });
    }

    if (!['receivable', 'payable'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Tür "receivable" veya "payable" olmalıdır.' },
      });
    }

    const entry = await prisma.ledgerEntry.create({
      data: {
        userId,
        personName,
        amount: parseFloat(amount),
        type,
        note: note || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error: any) {
    logger.error('Ledger createEntry error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// PUT /ledger/:id — Update entry
export const updateEntry = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { personName, amount, type, note, dueDate, status } = req.body;

    const existing = await prisma.ledgerEntry.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Kayıt bulunamadı.' } });
    }

    const updateData: any = {};
    if (personName !== undefined) updateData.personName = personName;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (type !== undefined) updateData.type = type;
    if (note !== undefined) updateData.note = note;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) updateData.status = status;

    const entry = await prisma.ledgerEntry.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: entry });
  } catch (error: any) {
    logger.error('Ledger updateEntry error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// PUT /ledger/:id/paid — Mark as paid
export const markPaid = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existing = await prisma.ledgerEntry.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Kayıt bulunamadı.' } });
    }

    const entry = await prisma.ledgerEntry.update({
      where: { id },
      data: {
        status: existing.status === 'paid' ? 'pending' : 'paid',
        paidAt: existing.status === 'paid' ? null : new Date(),
      },
    });

    res.json({ success: true, data: entry });
  } catch (error: any) {
    logger.error('Ledger markPaid error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// DELETE /ledger/:id — Delete entry
export const deleteEntry = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existing = await prisma.ledgerEntry.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Kayıt bulunamadı.' } });
    }

    await prisma.ledgerEntry.delete({ where: { id } });

    res.json({ success: true, message: 'Kayıt silindi.' });
  } catch (error: any) {
    logger.error('Ledger deleteEntry error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

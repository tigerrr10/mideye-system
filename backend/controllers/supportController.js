const { SupportTicket } = require('../models');
const generateSupportTicketCode = require('../utils/generateSupportTicketCode');
const { isValidSomaliPhone, normalizeSomaliPhone } = require('../utils/phone');

// POST /api/support — public (homepage WhatsApp flow)
const createSupportTicket = async (req, res) => {
  try {
    const { customer_name, phone, email, subject, message } = req.body;

    if (!customer_name?.trim() || !phone?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and message are required.',
      });
    }

    if (!isValidSomaliPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid Somali phone number (e.g. +252 90 1234567).',
      });
    }

    const ticket_code = await generateSupportTicketCode();
    const normalizedPhone = normalizeSomaliPhone(phone);
    const cleanSubject = (subject?.trim() || message.trim().slice(0, 80)).slice(0, 255);

    const ticket = await SupportTicket.create({
      ticket_code,
      customer_name: customer_name.trim(),
      phone: normalizedPhone,
      email: email?.trim() || null,
      subject: cleanSubject,
      message: message.trim(),
      source: 'whatsapp',
      status: 'Open',
      priority: 'Normal',
      user_id: req.user?.id || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Support request received.',
      data: { ticket },
    });
  } catch (error) {
    console.error('Create support ticket error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/admin/support
const getAllSupportTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.findAll({
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      count: tickets.length,
      data: { tickets },
    });
  } catch (error) {
    console.error('Get support tickets error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/admin/support/:id/status
const updateSupportTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Open', 'In Progress', 'Resolved'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    await ticket.update({
      status,
      resolved_at: status === 'Resolved' ? new Date() : null,
    });

    return res.status(200).json({
      success: true,
      message: `Ticket marked as ${status}.`,
      data: { ticket },
    });
  } catch (error) {
    console.error('Update support ticket error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  createSupportTicket,
  getAllSupportTickets,
  updateSupportTicketStatus,
};

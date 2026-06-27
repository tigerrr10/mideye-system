const { SupportTicket } = require('../models');

const generateSupportTicketCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `SUP-${year}-`;

  const latest = await SupportTicket.findOne({
    where: {},
    order: [['id', 'DESC']],
    attributes: ['ticket_code'],
  });

  let next = 1;
  if (latest?.ticket_code?.startsWith(prefix)) {
    const num = parseInt(latest.ticket_code.slice(prefix.length), 10);
    if (!Number.isNaN(num)) next = num + 1;
  }

  return `${prefix}${String(next).padStart(5, '0')}`;
};

module.exports = generateSupportTicketCode;

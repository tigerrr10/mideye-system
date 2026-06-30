const { Op } = require('sequelize');
const { Flight } = require('../models');
const { FLIGHT_STATUSES } = require('../utils/flightStatuses');

const nextFlightId = async () => {
  const last = await Flight.findOne({
    where: { flight_id: { [Op.like]: 'FL-%' } },
    order: [['id', 'DESC']],
  });
  const lastNumber = parseInt((last?.flight_id || '').replace('FL-', ''), 10);
  const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
  return `FL-${String(next).padStart(4, '0')}`;
};

const parseFlight = (f) => {
  const row = f.toJSON ? f.toJSON() : f;
  return {
    ...row,
    price_economy: parseFloat(row.price_economy),
    price_business: row.price_business != null ? parseFloat(row.price_business) : null,
    price_first: row.price_first != null ? parseFloat(row.price_first) : null,
  };
};

const validateFlightBody = (body, isUpdate = false) => {
  const required = ['airline', 'origin', 'destination', 'departure_time', 'duration', 'schedule_date', 'price_economy'];
  if (!isUpdate) {
    for (const field of required) {
      if (!String(body[field] ?? '').trim()) {
        return `Missing required field: ${field}`;
      }
    }
  }

  if (body.origin && body.destination && body.origin === body.destination) {
    return 'Origin and destination must be different.';
  }

  const totalSeats = body.total_seats != null ? parseInt(body.total_seats, 10) : null;
  const availableSeats = body.available_seats != null ? parseInt(body.available_seats, 10) : null;
  if (totalSeats != null && (Number.isNaN(totalSeats) || totalSeats < 1)) {
    return 'Total seats must be at least 1.';
  }
  if (availableSeats != null && (Number.isNaN(availableSeats) || availableSeats < 0)) {
    return 'Available seats cannot be negative.';
  }
  if (totalSeats != null && availableSeats != null && availableSeats > totalSeats) {
    return 'Available seats cannot exceed total seats.';
  }

  if (body.status && !FLIGHT_STATUSES.includes(body.status)) {
    return 'Invalid flight status.';
  }

  return null;
};

const buildFlightPayload = (body) => {
  const totalSeats = parseInt(body.total_seats, 10) || 120;
  const availableSeats = body.available_seats != null
    ? parseInt(body.available_seats, 10)
    : totalSeats;

  return {
    flight_code: String(body.flight_code || '').trim().toUpperCase(),
    airline: String(body.airline).trim(),
    origin: String(body.origin).trim().toUpperCase(),
    destination: String(body.destination).trim().toUpperCase(),
    departure_time: String(body.departure_time).trim(),
    arrival_time: body.arrival_time ? String(body.arrival_time).trim() : null,
    duration: String(body.duration).trim(),
    schedule_date: body.schedule_date,
    price_economy: parseFloat(body.price_economy),
    price_business: body.price_business != null && body.price_business !== ''
      ? parseFloat(body.price_business)
      : null,
    price_first: body.price_first != null && body.price_first !== ''
      ? parseFloat(body.price_first)
      : null,
    total_seats: totalSeats,
    available_seats: Math.min(availableSeats, totalSeats),
    status: body.status && FLIGHT_STATUSES.includes(body.status) ? body.status : 'Scheduled',
  };
};

// GET /api/flights?from=&to=&date=
const searchFlights = async (req, res) => {
  try {
    const { from, to, date, flight_id } = req.query;
    if (flight_id) {
      const flight = await Flight.findOne({
        where: { flight_id: String(flight_id).trim().toUpperCase() },
      });
      if (!flight) {
        return res.status(404).json({ success: false, message: 'Flight not found.' });
      }
      return res.status(200).json({
        success: true,
        count: 1,
        data: { flights: [parseFlight(flight)] },
      });
    }

    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'Origin and destination are required.' });
    }

    const where = {
      origin: String(from).toUpperCase(),
      destination: String(to).toUpperCase(),
      status: 'Active',
      available_seats: { [Op.gt]: 0 },
    };

    if (date) where.schedule_date = date;

    let flights = await Flight.findAll({
      where,
      order: [['schedule_date', 'ASC'], ['departure_time', 'ASC']],
    });

    // If no flights on exact date, show any active flights on this route
    if (!flights.length && date) {
      const { schedule_date, ...routeWhere } = where;
      flights = await Flight.findAll({
        where: routeWhere,
        order: [['schedule_date', 'ASC'], ['departure_time', 'ASC']],
      });
    }

    return res.status(200).json({
      success: true,
      count: flights.length,
      data: { flights: flights.map(parseFlight) },
    });
  } catch (error) {
    console.error('Search flights error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/admin/flights
const getAllFlights = async (req, res) => {
  try {
    const flights = await Flight.findAll({
      order: [['schedule_date', 'DESC'], ['departure_time', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      count: flights.length,
      data: { flights: flights.map(parseFlight) },
    });
  } catch (error) {
    console.error('Admin get flights error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/admin/flights
const createFlight = async (req, res) => {
  try {
    const error = validateFlightBody(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    const payload = buildFlightPayload(req.body);

    if (!payload.flight_code) {
      const count = await Flight.count();
      payload.flight_code = `MDY-FL-${String(count + 1).padStart(4, '0')}`;
    }

    const exists = await Flight.findOne({ where: { flight_code: payload.flight_code } });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Flight code already exists.' });
    }

    payload.flight_id = await nextFlightId();

    if (payload.available_seats === 0) payload.status = 'Full';

    const flight = await Flight.create(payload);

    return res.status(201).json({
      success: true,
      message: 'Flight created successfully.',
      data: { flight: parseFlight(flight) },
    });
  } catch (error) {
    console.error('Create flight error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PUT /api/admin/flights/:id
const updateFlight = async (req, res) => {
  try {
    const flight = await Flight.findByPk(req.params.id);
    if (!flight) {
      return res.status(404).json({ success: false, message: 'Flight not found.' });
    }

    const error = validateFlightBody(req.body, true);
    if (error) return res.status(400).json({ success: false, message: error });

    const payload = buildFlightPayload({ ...flight.toJSON(), ...req.body });
    payload.flight_id = flight.flight_id;

    if (payload.flight_code !== flight.flight_code) {
      const exists = await Flight.findOne({ where: { flight_code: payload.flight_code } });
      if (exists) {
        return res.status(409).json({ success: false, message: 'Flight code already exists.' });
      }
    }

    if (payload.available_seats === 0 && payload.status !== 'Cancelled') {
      payload.status = 'Full';
    }

    await flight.update(payload);

    return res.status(200).json({
      success: true,
      message: 'Flight updated successfully.',
      data: { flight: parseFlight(flight) },
    });
  } catch (error) {
    console.error('Update flight error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// DELETE /api/admin/flights/:id
const deleteFlight = async (req, res) => {
  try {
    const flight = await Flight.findByPk(req.params.id);
    if (!flight) {
      return res.status(404).json({ success: false, message: 'Flight not found.' });
    }

    await flight.destroy();

    return res.status(200).json({
      success: true,
      message: 'Flight deleted successfully.',
    });
  } catch (error) {
    console.error('Delete flight error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  searchFlights,
  getAllFlights,
  createFlight,
  updateFlight,
  deleteFlight,
};

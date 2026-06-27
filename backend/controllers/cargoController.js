const { Cargo, User } = require('../models');
const generateTrackingId = require('../utils/generateTrackingId');
const {
  CARGO_STATUSES,
  CARGO_STATUS_DEFAULT,
  CARGO_WORKFLOW_STEPS,
  isValidCargoStatus,
} = require('../utils/cargoStatuses');

// POST /api/cargo
const createCargo = async (req, res) => {
  try {
    const {
      sender_name,
      sender_phone,
      sender_email,
      sender_address,
      recipient_name,
      recipient_phone,
      destination,
      cargo_type,
      pieces,
      weight,
      length_cm,
      width_cm,
      description,
      shipping_speed,
      insurance,
      fragile,
      signature_required,
      special_requests,
    } = req.body;

    const tracking_id = await generateTrackingId();

    const cargo = await Cargo.create({
      tracking_id,
      user_id: req.user ? req.user.id : null,
      sender_name,
      sender_phone,
      sender_email: sender_email || null,
      sender_address: sender_address || null,
      recipient_name,
      recipient_phone,
      origin: 'Galkacyo (GLK)',
      destination,
      cargo_type,
      pieces: pieces || 1,
      weight,
      length_cm: length_cm || null,
      width_cm: width_cm || null,
      description: description || null,
      shipping_speed: shipping_speed || 'standard',
      insurance: insurance === true || insurance === 'true' || false,
      fragile: fragile === true || fragile === 'true' || false,
      signature_required: signature_required === true || signature_required === 'true' || false,
      special_requests: special_requests || null,
      status: CARGO_STATUS_DEFAULT,
    });

    return res.status(201).json({
      success: true,
      message: 'Cargo request submitted successfully.',
      data: {
        cargo,
        tracking_id,
        note: 'Save your tracking ID to track your shipment.',
      },
    });
  } catch (error) {
    console.error('Create cargo error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

// GET /api/cargo
const getCargo = async (req, res) => {
  try {
    const where = req.user.role === 'admin' ? {} : { user_id: req.user.id };

    const shipments = await Cargo.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'full_name', 'email'],
          required: false,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      count: shipments.length,
      data: { shipments },
    });
  } catch (error) {
    console.error('Get cargo error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/cargo/:id
const getCargoById = async (req, res) => {
  try {
    const cargo = await Cargo.findByPk(req.params.id);
    if (!cargo) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }

    if (req.user.role !== 'admin' && cargo.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.status(200).json({ success: true, data: { cargo } });
  } catch (error) {
    console.error('Get cargo by ID error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PUT /api/cargo/:id  (admin updates status)
const updateCargoStatus = async (req, res) => {
  try {
    const cargo = await Cargo.findByPk(req.params.id);
    if (!cargo) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }

    const { status, cancellation_reason } = req.body;
    if (!isValidCargoStatus(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${CARGO_STATUSES.join(', ')}`,
      });
    }

    const updates = { status };

    if (status === 'Cancelled') {
      const reason = (cancellation_reason || '').trim();
      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Cancellation reason is required when status is Cancelled.',
        });
      }
      updates.cancellation_reason = reason;
      updates.delivered_at = null;
    } else {
      updates.cancellation_reason = null;
      if (status === 'Delivered') {
        updates.delivered_at = new Date();
      } else {
        updates.delivered_at = null;
      }
    }

    await cargo.update(updates);

    return res.status(200).json({
      success: true,
      message: `Cargo status updated to "${status}".`,
      data: { cargo },
    });
  } catch (error) {
    console.error('Update cargo error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/track/:tracking_id  (authenticated users only)
const trackCargo = async (req, res) => {
  try {
    const { tracking_id } = req.params;

    const cargo = await Cargo.findOne({
      where: { tracking_id: tracking_id.toUpperCase() },
      attributes: [
        'user_id',
        'tracking_id',
        'sender_name',
        'sender_phone',
        'recipient_name',
        'recipient_phone',
        'origin',
        'destination',
        'cargo_type',
        'weight',
        'pieces',
        'description',
        'shipping_speed',
        'status',
        'cancellation_reason',
        'delivered_at',
        'created_at',
        'updated_at',
      ],
    });

    if (!cargo) {
      return res.status(404).json({
        success: false,
        message: `No shipment found for tracking ID "${tracking_id}". Please check the ID and try again.`,
      });
    }

    // Regular users may only track shipments linked to their account
    if (req.user.role !== 'admin' && cargo.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: `No shipment found for tracking ID "${tracking_id}". Please check the ID and try again.`,
      });
    }

    const cargoData = cargo.toJSON();
    delete cargoData.user_id;

    const statusTimeline = buildTimeline(cargo.status, cargo.created_at, cargo.updated_at);

    return res.status(200).json({
      success: true,
      data: {
        cargo: cargoData,
        timeline: statusTimeline,
      },
    });
  } catch (error) {
    console.error('Track cargo error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const buildTimeline = (currentStatus, createdAt, updatedAt) => {
  if (currentStatus === 'Cancelled') {
    return [{
      status: 'Cancelled',
      completed: true,
      active: true,
      updated_at: updatedAt,
    }];
  }

  const currentIndex = CARGO_WORKFLOW_STEPS.indexOf(currentStatus);

  return CARGO_WORKFLOW_STEPS.map((status, index) => ({
    status,
    completed: currentIndex >= 0 && index <= currentIndex,
    active: index === currentIndex,
    updated_at: index === currentIndex ? updatedAt : null,
  }));
};

module.exports = { createCargo, getCargo, getCargoById, updateCargoStatus, trackCargo };

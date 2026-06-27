const { Op } = require('sequelize');
const { City } = require('../models');

const getAllCities = async (req, res) => {
  try {
    const activeOnly = req.baseUrl === '/api/cities';
    const cities = await City.findAll({
      where: activeOnly ? { is_active: { [Op.not]: false } } : undefined,
      order: [['name', 'ASC']],
    });
    return res.status(200).json({ success: true, count: cities.length, data: { cities } });
  } catch (error) {
    console.error('Get cities error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const createCity = async (req, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    const name = String(req.body.name || '').trim();

    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'City code and name are required.' });
    }

    const exists = await City.findOne({ where: { code } });
    if (exists) {
      return res.status(409).json({ success: false, message: 'A city with this code already exists.' });
    }

    const city = await City.create({ code, name, is_active: req.body.is_active !== false });
    return res.status(201).json({ success: true, message: 'City created.', data: { city } });
  } catch (error) {
    console.error('Create city error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const updateCity = async (req, res) => {
  try {
    const city = await City.findByPk(req.params.id);
    if (!city) {
      return res.status(404).json({ success: false, message: 'City not found.' });
    }

    const code = req.body.code !== undefined ? String(req.body.code).trim().toUpperCase() : city.code;
    const name = req.body.name !== undefined ? String(req.body.name).trim() : city.name;

    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'City code and name are required.' });
    }

    if (code !== city.code) {
      const exists = await City.findOne({ where: { code } });
      if (exists) {
        return res.status(409).json({ success: false, message: 'A city with this code already exists.' });
      }
    }

    await city.update({
      code,
      name,
      is_active: req.body.is_active !== undefined ? !!req.body.is_active : city.is_active,
    });

    return res.status(200).json({ success: true, message: 'City updated.', data: { city } });
  } catch (error) {
    console.error('Update city error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const deleteCity = async (req, res) => {
  try {
    const city = await City.findByPk(req.params.id);
    if (!city) {
      return res.status(404).json({ success: false, message: 'City not found.' });
    }

    await city.destroy();
    return res.status(200).json({ success: true, message: 'City deleted.' });
  } catch (error) {
    console.error('Delete city error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getAllCities, createCity, updateCity, deleteCity };

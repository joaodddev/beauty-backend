const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Armazenamento em memória (substituir por banco de dados)
let appointments = [];
let nextId = 1;

// Validações
const appointmentValidation = [
  body('clientName').notEmpty().trim().escape(),
  body('clientPhone').notEmpty().matches(/^[0-9]{10,11}$/),
  body('clientEmail').optional().isEmail().normalizeEmail(),
  body('service').notEmpty().isIn(['unhas', 'sobrancelhas', 'cilios', 'skincare']),
  body('date').notEmpty().isDate(),
  body('time').notEmpty().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('notes').optional().trim().escape()
];

// GET /api/appointments - Listar todos os agendamentos
router.get('/', (req, res) => {
  try {
    const { startDate, endDate, service } = req.query;
    let filtered = [...appointments];

    if (startDate && endDate) {
      filtered = filtered.filter(app => {
        const appDate = new Date(app.date);
        return appDate >= new Date(startDate) && appDate <= new Date(endDate);
      });
    }

    if (service) {
      filtered = filtered.filter(app => app.service === service);
    }

    res.json({
      success: true,
      count: filtered.length,
      data: filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar agendamentos'
    });
  }
});

// GET /api/appointments/today - Agendamentos de hoje
router.get('/today', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(app => app.date === today);
    
    res.json({
      success: true,
      count: todayAppointments.length,
      data: todayAppointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar agendamentos de hoje'
    });
  }
});

// POST /api/appointments - Criar novo agendamento
router.post('/', appointmentValidation, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    // Verificar se horário está disponível
    const existingAppointment = appointments.find(app => 
      app.date === req.body.date && 
      app.time === req.body.time
    );

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        error: 'Horário já reservado'
      });
    }

    const appointment = {
      id: nextId++,
      ...req.body,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    appointments.push(appointment);

    res.status(201).json({
      success: true,
      message: 'Agendamento criado com sucesso!',
      data: appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao criar agendamento'
    });
  }
});

// POST /api/appointments/sync - Sincronização offline
router.post('/sync', (req, res) => {
  try {
    const { appointments: offlineAppointments, lastSync } = req.body;
    const serverUpdates = [];

    // Processar cada agendamento offline
    offlineAppointments.forEach(offlineApp => {
      // Verificar se já existe no servidor
      const existingIndex = appointments.findIndex(app => 
        app.syncId === offlineApp.syncId
      );

      if (existingIndex >= 0) {
        // Atualizar existente
        appointments[existingIndex] = {
          ...offlineApp,
          updatedAt: new Date().toISOString(),
          isSynced: true
        };
      } else {
        // Criar novo
        const newApp = {
          ...offlineApp,
          id: nextId++,
          isSynced: true
        };
        appointments.push(newApp);
      }

      serverUpdates.push({
        syncId: offlineApp.syncId,
        id: offlineApp.id || nextId,
        isSynced: true
      });
    });

    res.json({
      success: true,
      message: 'Sincronização concluída',
      data: {
        serverUpdates,
        lastSync: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro na sincronização'
    });
  }
});

// PUT /api/appointments/:id - Atualizar agendamento
router.put('/:id', appointmentValidation, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const id = parseInt(req.params.id);
    const index = appointments.findIndex(app => app.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Agendamento não encontrado'
      });
    }

    appointments[index] = {
      ...appointments[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Agendamento atualizado com sucesso!',
      data: appointments[index]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar agendamento'
    });
  }
});

// DELETE /api/appointments/:id - Cancelar agendamento
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = appointments.findIndex(app => app.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Agendamento não encontrado'
      });
    }

    const [deletedAppointment] = appointments.splice(index, 1);

    res.json({
      success: true,
      message: 'Agendamento cancelado com sucesso!',
      data: deletedAppointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao cancelar agendamento'
    });
  }
});

module.exports = router;
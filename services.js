const express = require('express');
const router = express.Router();

// Dados dos serviços
const services = [
  {
    id: 'unhas',
    name: 'Unhas',
    description: 'Manicure e pedicure completa',
    duration: 60,
    price: 45.00,
    category: 'beauty',
    available: true,
    professionals: ['Ana', 'Maria']
  },
  {
    id: 'sobrancelhas',
    name: 'Sobrancelhas',
    description: 'Design e henna',
    duration: 45,
    price: 35.00,
    category: 'facial',
    available: true,
    professionals: ['Carla']
  },
  {
    id: 'cilios',
    name: 'Cílios',
    description: 'Extensão e lifting',
    duration: 90,
    price: 120.00,
    category: 'facial',
    available: true,
    professionals: ['Juliana']
  },
  {
    id: 'skincare',
    name: 'Skincare',
    description: 'Limpeza de pele facial',
    duration: 80,
    price: 90.00,
    category: 'facial',
    available: true,
    professionals: ['Beatriz']
  }
];

// GET /api/services - Listar todos os serviços
router.get('/', (req, res) => {
  res.json({
    success: true,
    count: services.length,
    data: services
  });
});

// GET /api/services/:id - Obter serviço específico
router.get('/:id', (req, res) => {
  const service = services.find(s => s.id === req.params.id);
  
  if (!service) {
    return res.status(404).json({
      success: false,
      error: 'Serviço não encontrado'
    });
  }

  res.json({
    success: true,
    data: service
  });
});

// GET /api/services/available/times - Horários disponíveis
router.get('/available/times', (req, res) => {
  const { date, serviceId, duration = 60 } = req.query;

  if (!date) {
    return res.status(400).json({
      success: false,
      error: 'Data é obrigatória'
    });
  }

  // Gerar horários disponíveis baseado no horário comercial
  const businessHours = {
    start: 8, // 08:00
    end: 18, // 18:00
    breakStart: 12, // Almoço
    breakEnd: 13
  };

  const slots = [];
  const interval = 30; // 30 minutos

  for (let hour = businessHours.start; hour < businessHours.end; hour += interval / 60) {
    const hourInt = Math.floor(hour);
    const minutes = (hour % 1) * 60;
    const timeString = `${hourInt.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // Pular horário de almoço
    if (hour >= businessHours.breakStart && hour < businessHours.breakEnd) {
      continue;
    }

    slots.push({
      time: timeString,
      available: true
    });
  }

  // Verificar agendamentos existentes para esta data
  const existingAppointments = require('./appointments').appointments.filter(app => 
    app.date === date
  );

  // Marcar horários indisponíveis
  slots.forEach(slot => {
    const isBooked = existingAppointments.some(app => 
      app.time === slot.time
    );
    
    if (isBooked) {
      slot.available = false;
      slot.reason = 'Horário já reservado';
    }
  });

  res.json({
    success: true,
    date: date,
    slots: slots,
    businessHours: businessHours
  });
});

module.exports = router;
// server.js - Código completo e testável no OneCompiler
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Armazenamento em memória
let appointments = [];
let nextId = 1;

// === ROTAS DA API ===

// 1. Health Check
app.get('/', (req, res) => {
  res.json({
    message: 'API da Brotas Beauty Online',
    status: 'online',
    endpoints: [
      'GET  /api/appointments',
      'POST /api/appointments',
      'GET  /api/services',
      'GET  /api/available-times'
    ]
  });
});

// 2. Listar todos os agendamentos
app.get('/api/appointments', (req, res) => {
  res.json({
    success: true,
    count: appointments.length,
    data: appointments
  });
});

// 3. Criar novo agendamento
app.post('/api/appointments', (req, res) => {
  const { clientName, phone, service, date, time } = req.body;
  
  if (!clientName || !phone || !service || !date || !time) {
    return res.status(400).json({
      success: false,
      error: 'Todos os campos são obrigatórios'
    });
  }
  
  const newAppointment = {
    id: nextId++,
    clientName,
    phone,
    service,
    date,
    time,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  appointments.push(newAppointment);
  
  res.status(201).json({
    success: true,
    message: 'Agendamento criado com sucesso!',
    data: newAppointment
  });
});

// 4. Obter serviços
app.get('/api/services', (req, res) => {
  const services = [
    {
      id: 'unhas',
      name: 'Unhas',
      description: 'Manicure e pedicure completa',
      duration: 60,
      price: 45.00,
      category: 'beauty'
    },
    {
      id: 'sobrancelhas',
      name: 'Sobrancelhas',
      description: 'Design e henna',
      duration: 45,
      price: 35.00,
      category: 'facial'
    },
    {
      id: 'cilios',
      name: 'Cílios',
      description: 'Extensão e lifting',
      duration: 90,
      price: 120.00,
      category: 'facial'
    },
    {
      id: 'skincare',
      name: 'Skincare',
      description: 'Limpeza de pele facial',
      duration: 80,
      price: 90.00,
      category: 'facial'
    }
  ];
  
  res.json({
    success: true,
    count: services.length,
    data: services
  });
});

// 5. Horários disponíveis
app.get('/api/available-times', (req, res) => {
  const { date } = req.query;
  
  if (!date) {
    return res.status(400).json({
      success: false,
      error: 'Parâmetro "date" é obrigatório (ex: ?date=2024-12-20)'
    });
  }
  
  // Gerar horários das 8h às 18h
  const timeSlots = [];
  for (let hour = 8; hour <= 18; hour++) {
    timeSlots.push(`${hour}:00`);
    if (hour < 18) timeSlots.push(`${hour}:30`);
  }
  
  // Filtrar horários já agendados
  const bookedAppointments = appointments.filter(app => app.date === date);
  const bookedTimes = bookedAppointments.map(app => app.time);
  
  const availableSlots = timeSlots.map(time => ({
    time,
    available: !bookedTimes.includes(time)
  }));
  
  res.json({
    success: true,
    date,
    totalSlots: timeSlots.length,
    booked: bookedTimes.length,
    data: availableSlots
  });
});

// 6. Dashboard admin
app.get('/api/admin/dashboard', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = appointments.filter(app => app.date === today);
  
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekBookings = appointments.filter(app => 
    new Date(app.date) >= weekAgo
  );
  
  const uniqueClients = [...new Set(appointments.map(a => a.phone))].length;
  
  // Estatísticas de serviços
  const serviceStats = {};
  appointments.forEach(app => {
    if (!serviceStats[app.service]) {
      serviceStats[app.service] = 0;
    }
    serviceStats[app.service]++;
  });
  
  res.json({
    success: true,
    stats: {
      totalAppointments: appointments.length,
      todayBookings: todayBookings.length,
      weekBookings: weekBookings.length,
      uniqueClients: uniqueClients,
      serviceStats: serviceStats
    },
    recentBookings: appointments.slice(-5).reverse()
  });
});

// 7. Login admin (simulado)
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'brotas2024') {
    res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      token: 'admin_token_' + Date.now(),
      user: {
        username: 'admin',
        name: 'Administrador Brotas Beauty'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Credenciais inválidas'
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 API Brotas Beauty rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  console.log('📡 Endpoints disponíveis:');
  console.log('   GET  /                     - Página inicial');
  console.log('   GET  /api/appointments     - Listar agendamentos');
  console.log('   POST /api/appointments     - Criar agendamento');
  console.log('   GET  /api/services         - Listar serviços');
  console.log('   GET  /api/available-times  - Horários disponíveis');
  console.log('   GET  /api/admin/dashboard  - Dashboard admin');
  console.log('   POST /api/admin/login      - Login admin');
});
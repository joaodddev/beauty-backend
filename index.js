const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Armazenamento em memória
let appointments = [];
let appointmentId = 1;

// ==================== ROTAS DA API ====================

// 1. Rota inicial
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API Brotas Beauty Online!',
    version: '1.0.0',
    author: 'joaodddev',
    github: 'https://github.com/joaodddev/beauty-backend',
    endpoints: {
      services: 'GET /api/services',
      appointments: {
        list: 'GET /api/appointments',
        create: 'POST /api/appointments',
        today: 'GET /api/appointments/today'
      },
      admin: {
        dashboard: 'GET /api/admin/dashboard',
        login: 'POST /api/admin/login'
      }
    }
  });
});

// 2. Listar serviços
app.get('/api/services', (req, res) => {
  const services = [
    {
      id: 'unhas',
      name: 'Unhas',
      description: 'Manicure e pedicure completa',
      duration: 60,
      price: 45.00,
      category: 'beauty',
      icon: '💅'
    },
    {
      id: 'sobrancelhas',
      name: 'Sobrancelhas',
      description: 'Design e henna',
      duration: 45,
      price: 35.00,
      category: 'facial',
      icon: '✏️'
    },
    {
      id: 'cilios',
      name: 'Cílios',
      description: 'Extensão e lifting',
      duration: 90,
      price: 120.00,
      category: 'facial',
      icon: '👁️'
    },
    {
      id: 'skincare',
      name: 'Skincare',
      description: 'Limpeza de pele facial',
      duration: 80,
      price: 90.00,
      category: 'facial',
      icon: '🌸'
    }
  ];
  
  res.json({
    success: true,
    count: services.length,
    data: services
  });
});

// 3. Horários disponíveis
app.get('/api/available-times', (req, res) => {
  const { date = new Date().toISOString().split('T')[0] } = req.query;
  
  // Gerar horários das 8h às 18h
  const timeSlots = [];
  for (let hour = 8; hour <= 18; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 18) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  
  // Filtrar horários já agendados
  const bookedAppointments = appointments.filter(
    appointment => appointment.date === date
  );
  
  const availableSlots = timeSlots.map(time => ({
    time,
    available: !bookedAppointments.some(app => app.time === time),
    formatted: time
  }));
  
  res.json({
    success: true,
    date,
    totalSlots: timeSlots.length,
    available: availableSlots.filter(slot => slot.available).length,
    data: availableSlots
  });
});

// 4. Criar agendamento
app.post('/api/appointments', (req, res) => {
  try {
    const { clientName, phone, service, date, time, email, notes } = req.body;
    
    // Validação básica
    if (!clientName || !phone || !service || !date || !time) {
      return res.status(400).json({
        success: false,
        error: 'Nome, telefone, serviço, data e horário são obrigatórios'
      });
    }
    
    // Verificar se horário está disponível
    const isTimeBooked = appointments.some(
      app => app.date === date && app.time === time
    );
    
    if (isTimeBooked) {
      return res.status(409).json({
        success: false,
        error: 'Este horário já está reservado'
      });
    }
    
    // Criar novo agendamento
    const newAppointment = {
      id: appointmentId++,
      clientName,
      phone,
      email: email || '',
      service,
      date,
      time,
      notes: notes || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    appointments.push(newAppointment);
    
    // Enviar para WhatsApp (simulação)
    const whatsappMessage = `✅ Novo agendamento!\n👤 Cliente: ${clientName}\n📱 Telefone: ${phone}\n💅 Serviço: ${service}\n📅 Data: ${date}\n⏰ Horário: ${time}`;
    
    res.status(201).json({
      success: true,
      message: 'Agendamento criado com sucesso!',
      whatsapp: `https://wa.me/5514991244578?text=${encodeURIComponent(whatsappMessage)}`,
      data: newAppointment
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao processar agendamento'
    });
  }
});

// 5. Listar agendamentos
app.get('/api/appointments', (req, res) => {
  const { date, service, status } = req.query;
  
  let filteredAppointments = [...appointments];
  
  // Aplicar filtros
  if (date) {
    filteredAppointments = filteredAppointments.filter(app => app.date === date);
  }
  
  if (service) {
    filteredAppointments = filteredAppointments.filter(app => app.service === service);
  }
  
  if (status) {
    filteredAppointments = filteredAppointments.filter(app => app.status === status);
  }
  
  // Ordenar por data mais recente
  filteredAppointments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({
    success: true,
    count: filteredAppointments.length,
    total: appointments.length,
    data: filteredAppointments
  });
});

// 6. Agendamentos de hoje
app.get('/api/appointments/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(app => app.date === today);
  
  res.json({
    success: true,
    date: today,
    count: todayAppointments.length,
    data: todayAppointments
  });
});

// 7. Dashboard admin
app.get('/api/admin/dashboard', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const stats = {
    totalAppointments: appointments.length,
    todayAppointments: appointments.filter(app => app.date === today).length,
    pendingAppointments: appointments.filter(app => app.status === 'pending').length,
    confirmedAppointments: appointments.filter(app => app.status === 'confirmed').length,
    
    // Estatísticas por serviço
    byService: appointments.reduce((acc, app) => {
      acc[app.service] = (acc[app.service] || 0) + 1;
      return acc;
    }, {}),
    
    // Últimos 7 dias
    lastWeek: appointments.filter(app => {
      const appDate = new Date(app.date);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return appDate >= weekAgo;
    }).length
  };
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    stats,
    recentBookings: appointments.slice(-10).reverse()
  });
});

// 8. Login admin
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  // Credenciais fixas (em produção, usar banco de dados)
  if (username === 'admin' && password === 'brotas2024') {
    res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      token: `admin_${Date.now()}`,
      user: {
        username: 'admin',
        name: 'Administrador Brotas Beauty',
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Credenciais inválidas'
    });
  }
});

// 9. Confirmar agendamento
app.put('/api/appointments/:id/confirm', (req, res) => {
  const { id } = req.params;
  const appointment = appointments.find(app => app.id === parseInt(id));
  
  if (!appointment) {
    return res.status(404).json({
      success: false,
      error: 'Agendamento não encontrado'
    });
  }
  
  appointment.status = 'confirmed';
  appointment.updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    message: 'Agendamento confirmado!',
    data: appointment
  });
});

// 10. Cancelar agendamento
app.delete('/api/appointments/:id', (req, res) => {
  const { id } = req.params;
  const index = appointments.findIndex(app => app.id === parseInt(id));
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Agendamento não encontrado'
    });
  }
  
  const [deleted] = appointments.splice(index, 1);
  
  res.json({
    success: true,
    message: 'Agendamento cancelado com sucesso!',
    data: deleted
  });
});

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, () => {
  console.log(`
  🚀  API Brotas Beauty iniciada!
  📡  URL: http://localhost:${PORT}
  
  📋  Endpoints disponíveis:
      GET  /                     - Documentação
      GET  /api/services         - Listar serviços
      GET  /api/available-times  - Horários disponíveis
      GET  /api/appointments     - Listar agendamentos
      POST /api/appointments     - Criar agendamento
      GET  /api/admin/dashboard  - Dashboard admin
      POST /api/admin/login      - Login admin
  
  👑  Credenciais admin:
      usuário: admin
      senha: brotas2024
  `);
});

// Tratamento de erros
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    suggestion: 'Verifique a documentação em /'
  });
});

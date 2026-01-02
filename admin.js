const express = require('express');
const router = express.Router();

// Dados simulados do dashboard
const dashboardData = {
  totalRevenue: 12500.00,
  averageRating: 4.8,
  popularServices: [
    { name: 'Unhas', count: 45, revenue: 4500 },
    { name: 'Sobrancelhas', count: 32, revenue: 2400 },
    { name: 'Cílios', count: 28, revenue: 4200 },
    { name: 'Skincare', count: 15, revenue: 1400 }
  ]
};

// Middleware de autenticação admin
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token de autenticação necessário'
    });
  }

  // Verificação básica do token
  const token = authHeader.split(' ')[1];
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({
      success: false,
      error: 'Token inválido'
    });
  }

  next();
};

// POST /api/admin/login - Login do admin
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Credenciais padrão (substituir por sistema de autenticação real)
  if (username === 'admin' && password === 'brotas2024') {
    const token = 'admin_token_' + Date.now(); // Gerar token simples
    
    res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      data: {
        token: token,
        user: {
          username: 'admin',
          name: 'Administrador Brotas Beauty',
          role: 'admin'
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Credenciais inválidas'
    });
  }
});

// GET /api/admin/dashboard - Dashboard do admin
router.get('/dashboard', authenticateAdmin, (req, res) => {
  try {
    // Obter dados dos agendamentos (simplificado)
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = require('./appointments').appointments.filter(app => 
      app.date === today
    );

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekAppointments = require('./appointments').appointments.filter(app => 
      new Date(app.date) >= weekAgo
    );

    const uniqueClients = [...new Set(require('./appointments').appointments.map(a => a.clientPhone))].length;

    res.json({
      success: true,
      data: {
        stats: {
          todayBookings: todayAppointments.length,
          weekBookings: weekAppointments.length,
          totalClients: uniqueClients,
          pendingConfirmations: todayAppointments.filter(a => a.status === 'pending').length
        },
        revenue: dashboardData.totalRevenue,
        averageRating: dashboardData.averageRating,
        popularServices: dashboardData.popularServices,
        recentBookings: require('./appointments').appointments
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao carregar dashboard'
    });
  }
});

// GET /api/admin/reports - Relatórios
router.get('/reports', authenticateAdmin, (req, res) => {
  const { type, startDate, endDate } = req.query;

  // Filtrar agendamentos pelo período
  const filteredAppointments = require('./appointments').appointments.filter(app => {
    if (!startDate || !endDate) return true;
    const appDate = new Date(app.date);
    return appDate >= new Date(startDate) && appDate <= new Date(endDate);
  });

  let report;
  
  switch(type) {
    case 'daily':
      report = generateDailyReport(filteredAppointments);
      break;
    case 'weekly':
      report = generateWeeklyReport(filteredAppointments);
      break;
    case 'monthly':
      report = generateMonthlyReport(filteredAppointments);
      break;
    default:
      report = {
        summary: {
          total: filteredAppointments.length,
          byService: {},
          byDay: {}
        }
      };
  }

  res.json({
    success: true,
    data: report
  });
});

// Funções auxiliares para relatórios
function generateDailyReport(appointments) {
  const byHour = {};
  for (let i = 8; i <= 17; i++) {
    const hour = i.toString().padStart(2, '0') + ':00';
    byHour[hour] = appointments.filter(a => a.time.startsWith(i)).length;
  }

  return {
    summary: {
      total: appointments.length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      pending: appointments.filter(a => a.status === 'pending').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length
    },
    byHour: byHour
  };
}

function generateWeeklyReport(appointments) {
  const byDay = {
    'Segunda': 0,
    'Terça': 0,
    'Quarta': 0,
    'Quinta': 0,
    'Sexta': 0,
    'Sábado': 0
  };

  appointments.forEach(app => {
    const day = new Date(app.date).toLocaleDateString('pt-BR', { weekday: 'long' });
    if (byDay[day] !== undefined) {
      byDay[day]++;
    }
  });

  return {
    summary: {
      total: appointments.length,
      byService: groupByService(appointments)
    },
    byDay: byDay
  };
}

function generateMonthlyReport(appointments) {
  const byWeek = {};
  const byService = groupByService(appointments);

  appointments.forEach(app => {
    const week = getWeekNumber(new Date(app.date));
    if (!byWeek[week]) {
      byWeek[week] = 0;
    }
    byWeek[week]++;
  });

  return {
    summary: {
      total: appointments.length,
      revenue: appointments.length * 100, // Valor médio estimado
      averagePerDay: (appointments.length / 30).toFixed(2)
    },
    byWeek: byWeek,
    byService: byService
  };
}

function groupByService(appointments) {
  const result = {};
  appointments.forEach(app => {
    if (!result[app.service]) {
      result[app.service] = 0;
    }
    result[app.service]++;
  });
  return result;
}

function getWeekNumber(date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDays = (date - firstDay) / 86400000;
  return Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
}

module.exports = router;
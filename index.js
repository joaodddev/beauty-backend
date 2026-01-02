const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (se houver frontend no mesmo projeto)
app.use(express.static(path.join(__dirname, 'public')));

// Rotas
const appointmentsRouter = require('./routes/appointments');
const adminRouter = require('./routes/admin');
const servicesRouter = require('./routes/services');

app.use('/api/appointments', appointmentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/services', servicesRouter);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Brotas Beauty API',
    version: '1.0.0'
  });
});

// Rota de boas-vindas
app.get('/', (req, res) => {
  res.json({
    message: 'Bem-vindo à API da Brotas Beauty',
    endpoints: {
      appointments: '/api/appointments',
      admin: '/api/admin',
      services: '/api/services',
      health: '/api/health'
    }
  });
});

// Middleware de erro 404
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    path: req.path
  });
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Ocorreu um erro'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Brotas Beauty rodando na porta ${PORT}`);
  console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
});
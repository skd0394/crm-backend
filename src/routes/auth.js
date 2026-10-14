const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const pool = require('../db/pool');
const config = require('../config');
const { HttpError, validate } = require('../middleware/errors');

const router = express.Router();

const email = z.string().trim().toLowerCase().pipe(z.email());

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email,
  password: z.string().min(8).max(72), // bcrypt ignores bytes past 72
});

const loginSchema = z.object({
  email,
  password: z.string().min(1),
});

function issueToken(employee) {
  return jwt.sign({ sub: String(employee.id), email: employee.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

router.post('/register', validate(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO employees (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, passwordHash],
    );
    const employee = rows[0];
    res.status(201).json({ token: issueToken(employee), employee });
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'An account with this email already exists');
    throw err;
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query(
    'SELECT id, name, email, password_hash, created_at FROM employees WHERE email = $1',
    [email],
  );
  const found = rows[0];
  if (!found || !(await bcrypt.compare(password, found.password_hash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  const { password_hash: _, ...employee } = found;
  res.json({ token: issueToken(employee), employee });
});

module.exports = router;

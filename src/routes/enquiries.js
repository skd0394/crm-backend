const express = require('express');
const { z } = require('zod');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { HttpError, validate } = require('../middleware/errors');

const router = express.Router();

const enquirySchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  phone: z.string().trim().max(20).optional(),
  courseInterest: z.string().trim().min(1).max(200),
  message: z.string().trim().max(2000).optional(),
});

const COLUMNS = `id, name, email, phone, course_interest AS "courseInterest", message,
  claimed_by AS "claimedBy", claimed_at AS "claimedAt", created_at AS "createdAt"`;

// Public enquiry form: no authentication.
router.post('/', validate(enquirySchema), async (req, res) => {
  const { name, email, phone, courseInterest, message } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO enquiries (name, email, phone, course_interest, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [name, email, phone ?? null, courseInterest, message ?? null],
  );
  res.status(201).json({ enquiry: rows[0] });
});

router.use(requireAuth);

// Unclaimed (public) enquiries, visible to every counselor.
router.get('/public', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM enquiries WHERE claimed_by IS NULL ORDER BY created_at DESC, id DESC`,
  );
  res.json({ enquiries: rows });
});

// Enquiries claimed by the logged-in counselor (private).
router.get('/mine', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM enquiries WHERE claimed_by = $1 ORDER BY claimed_at DESC, id DESC`,
    [req.employee.id],
  );
  res.json({ enquiries: rows });
});

router.patch('/:id/claim', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid enquiry id');

  // Single conditional UPDATE so two counselors claiming at once can't both win.
  const { rows } = await pool.query(
    `UPDATE enquiries SET claimed_by = $1, claimed_at = now()
     WHERE id = $2 AND claimed_by IS NULL
     RETURNING ${COLUMNS}`,
    [req.employee.id, id],
  );
  if (rows[0]) return res.json({ enquiry: rows[0] });

  const existing = await pool.query('SELECT claimed_by FROM enquiries WHERE id = $1', [id]);
  if (!existing.rows[0]) throw new HttpError(404, 'Enquiry not found');
  throw new HttpError(409, 'Enquiry has already been claimed');
});

module.exports = router;

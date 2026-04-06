import multer from 'multer';
import path from 'path';
import fs from 'fs';

function makeStorage(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
}

const imageFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
  cb(null, ok);
};

export const uploadReceipt = multer({
  storage: makeStorage('/app/uploads/receipts'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    cb(null, ok);
  },
});

export const uploadPoster = multer({
  storage: makeStorage('/app/uploads/posters'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
});

export const uploadPilotPhoto = multer({
  storage: makeStorage('/app/uploads/pilots'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
});

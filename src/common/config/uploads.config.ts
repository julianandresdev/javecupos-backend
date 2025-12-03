import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';

// Configuración de almacenamiento para avatares
export const avatarStorage = diskStorage({
  destination: './uploads/avatars',
  filename: (req, file, callback) => {
    // Generar nombre único con UUID
    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
    callback(null, uniqueName);
  },
});

// Filtro de tipos de archivo permitidos
export const avatarFileFilter = (req, file, callback) => {
  // Tipos MIME permitidos
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new BadRequestException(
        'Tipo de archivo no permitido. Solo se aceptan imágenes JPG, PNG o WebP',
      ),
      false,
    );
  }
};

// Límite de tamaño: 5MB
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB en bytes

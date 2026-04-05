import { Router } from 'express';
import { getChampionship, getChampionshipByYearCategory } from '../controllers/championship.controller.js';

const router = Router();

router.get('/', getChampionship);
router.get('/:year/:category', getChampionshipByYearCategory);

export default router;

import * as repo from './payment.repository.js';

export const getPaymentsByUnit = async (unitId, userContext) => {
  return await repo.findPaymentsByUnitId(unitId, userContext);
};

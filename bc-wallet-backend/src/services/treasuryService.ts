import { treasuryRepository } from '../repositories/treasuryRepository';

export const treasuryService = {
  async getTreasury() {
    return treasuryRepository.get();
  },

  async validateBalance() {
    return treasuryRepository.validateBalance();
  },
};

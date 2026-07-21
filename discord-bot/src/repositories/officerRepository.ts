import { supabase } from '../lib/supabase';
import type { OfficerRow } from '../types/database';

export class OfficerRepository {
  /**
   * Busca um oficial pelo ID interno do Supabase.
   */
  async findById(id: string): Promise<OfficerRow | null> {
    const normalizedId = id.trim();

    if (!normalizedId) {
      return null;
    }

    const { data, error } = await supabase
      .from('officers')
      .select('*')
      .eq('id', normalizedId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Não foi possível buscar o oficial pelo ID: ${error.message}`,
      );
    }

    return data as OfficerRow | null;
  }

  /**
   * Busca um oficial pela matrícula dentro de um proprietário específico.
   *
   * A tabela possui uma chave única formada por:
   * owner_id + registration.
   */
  async findByRegistration(
    ownerId: string,
    registration: string,
  ): Promise<OfficerRow | null> {
    const normalizedOwnerId = ownerId.trim();
    const normalizedRegistration = registration.trim().toUpperCase();

    if (!normalizedOwnerId || !normalizedRegistration) {
      return null;
    }

    const { data, error } = await supabase
      .from('officers')
      .select('*')
      .eq('owner_id', normalizedOwnerId)
      .eq('registration', normalizedRegistration)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Não foi possível buscar o oficial pela matrícula: ${error.message}`,
      );
    }

    return data as OfficerRow | null;
  }

  /**
   * Busca o oficial vinculado ao usuário do Discord.
   */
  async findByDiscordId(discordId: string): Promise<OfficerRow | null> {
    const normalizedDiscordId = discordId.trim();

    if (!normalizedDiscordId) {
      return null;
    }

    const { data, error } = await supabase
      .from('officers')
      .select('*')
      .eq('discord_id', normalizedDiscordId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Não foi possível buscar o oficial pelo Discord ID: ${error.message}`,
      );
    }

    return data as OfficerRow | null;
  }

  /**
   * Vincula ou atualiza o Discord ID de um oficial já cadastrado.
   */
  async updateDiscordId(
    officerId: string,
    discordId: string,
  ): Promise<OfficerRow> {
    const normalizedOfficerId = officerId.trim();
    const normalizedDiscordId = discordId.trim();

    if (!normalizedOfficerId) {
      throw new Error('O ID do oficial é obrigatório.');
    }

    if (!normalizedDiscordId) {
      throw new Error('O Discord ID é obrigatório.');
    }

    const { data, error } = await supabase
      .from('officers')
      .update({
        discord_id: normalizedDiscordId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', normalizedOfficerId)
      .select('*')
      .single();

    if (error) {
      throw new Error(
        `Não foi possível vincular o Discord ID ao oficial: ${error.message}`,
      );
    }

    return data as OfficerRow;
  }
}

export const officerRepository = new OfficerRepository();
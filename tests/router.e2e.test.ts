import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.ts';
import { professionals } from '../src/services/appointmentService.ts';
import { OpenRouterService } from '../src/services/openRouterService.ts';

mock.method(OpenRouterService.prototype, 'generateStructured', async (systemPrompt: string, userPrompt: string, schema: any) => {
    const today = new Date();
    
    const today14 = new Date(today);
    today14.setUTCHours(14, 0, 0, 0);
    
    const tomorrow16 = new Date(today);
    tomorrow16.setDate(tomorrow16.getDate() + 1);
    tomorrow16.setUTCHours(16, 0, 0, 0);

    if (userPrompt.includes('Cancele')) {
        return {
            success: true,
            data: { intent: 'cancel', professionalId: professionals[1].id, datetime: today14.toISOString(), patientName: 'Joao da Silva' }
        };
    } else if (userPrompt.includes('Maria Santos')) {
        return {
            success: true,
            data: { intent: 'schedule', professionalId: professionals[0].id, datetime: tomorrow16.toISOString(), patientName: 'Maria Santos', reason: 'check-up regular' }
        };
    } else if (userPrompt.includes('Joao da Silva')) {
        return {
            success: true,
            data: { intent: 'schedule', professionalId: professionals[1].id, datetime: today14.toISOString(), patientName: 'Joao da Silva', reason: 'Routine' }
        };
    }
    return { success: true, data: { message: 'Operação realizada com sucesso.' } };
});

const app = createServer();

async function makeARequest(question: string) {
    return await app.inject({
        method: 'POST',
        url: '/chat',
        payload: {
            question,
        },
    });
}

describe('Medical Appointment System - E2E Tests', async () => {

    it('Schedule appointment - Success', async () => {
        const response = await makeARequest(
            `Olá, sou Maria Santos e quero agendar uma consulta com ${professionals.at(0)?.name} para amanhã às 16h para um check-up regular`
        )

        console.log('Schedule Success Response:', response.body);

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.equal(body.intent, 'schedule');
        assert.equal(body.actionSuccess, true);
    });


    it('Cancel appointment - Success', async () => {

        await makeARequest(
            `Sou Joao da Silva e quero agendar uma consulta com ${professionals.at(1)?.name} para hoje às 14h`
        )

        const response = await makeARequest(
            `Cancele minha consulta com ${professionals.at(1)?.name} que tenho hoje às 14h, me chamo Joao da Silva`
        );

        console.log('Cancel Success Response:', response.body);

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.equal(body.intent, 'cancel');
        assert.equal(body.actionSuccess, true);
    });
});

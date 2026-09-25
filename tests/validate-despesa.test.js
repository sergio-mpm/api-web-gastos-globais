const test = require('node:test');
const assert = require('node:assert/strict');

global.window = { location: { port: '' } };
const { validateDespesa } = require('../scripts.js');

test('valida campos obrigatórios do gasto', () => {
  assert.equal(validateDespesa({
    descricao: '',
    valor: '120',
    moeda: 'EUR',
    tipo: 'Alimentação',
    dataDespesa: '2026-09-25'
  }), 'Informe a descrição da despesa.');

  assert.equal(validateDespesa({
    descricao: 'Almoço',
    valor: '',
    moeda: 'EUR',
    tipo: 'Alimentação',
    dataDespesa: '2026-09-25'
  }), 'Informe o valor da despesa.');

  assert.equal(validateDespesa({
    descricao: 'Almoço',
    valor: '120',
    moeda: '',
    tipo: 'Alimentação',
    dataDespesa: '2026-09-25'
  }), 'Selecione a moeda da despesa.');

  assert.equal(validateDespesa({
    descricao: 'Almoço',
    valor: '120',
    moeda: 'EUR',
    tipo: 'Alimentação',
    dataDespesa: ''
  }), 'Informe a data da despesa.');

  assert.equal(validateDespesa({
    descricao: 'Almoço',
    valor: '120',
    moeda: 'EUR',
    tipo: 'Alimentação',
    dataDespesa: '2026-09-25'
  }), null);
});

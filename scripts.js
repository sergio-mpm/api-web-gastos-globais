let despesas = [];
let usuarioLogado = null;
let cpfLogado = null;
let editId = null;
let editUsuarioCpf = null;
const defaultBaseUrl = window.location.port === '8080'
    ? 'http://host.docker.internal:5000'
    : 'http://localhost:5000';
let baseUrl = window.env?.BASE_URL || defaultBaseUrl;

/* ================= AUTH ================= */

function login() {
    const cpf = document.getElementById('loginCpf').value;
    const senha = document.getElementById('loginSenha').value;

    if (!cpf || !senha) {
        return alert('Por favor, informe o CPF e a Senha.');
    }

    fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf, senha })
    })
    .then(res => {
        if (!res.ok) throw new Error('CPF e/ou senha inválido(s)');
        return res.json();
    })
    .then(data => {
        sessionStorage.setItem('token', data.access_token);
        localStorage.setItem('token', data.access_token);
        sessionStorage.setItem('cpf', cpf);
        localStorage.setItem('cpf', cpf);

        usuarioLogado = cpf;
        alert('Login realizado com sucesso.');
        showApp();
    })
    .catch(err => {
        alert('Erro de Login: ' + err.message);
    });
}

function register() {
    console.log("baseUrl:", baseUrl)
    const user = document.getElementById('registerUser').value;
    const cpf = document.getElementById('registerCpf').value;
    const email = document.getElementById('registerEmail').value;
    const senha = document.getElementById('registerSenha').value;

    if (!user || !cpf) return alert('Informe nome e CPF');

    fetch(`${baseUrl}/usuarios/cadastrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: user, cpf: cpf, email: email, senha: senha })
    })
    .then(res => {
        if (!res.ok) throw new Error('Usuário já existe');
        alert('Usuário criado com sucesso');
        document.getElementById('registerUser').value = '';
        document.getElementById('registerCpf').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerSenha').value = '';
        toggleRegister();
    })
    .catch(err => alert(err.message));
}

function toggleRegister() {
    document.getElementById('registerBox').classList.toggle('d-none');
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);

    if(input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🔒';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

function logout() {
    const confirmar = confirm('Você precisará fazer login novamente para acessar as predições. Deseja sair?');
    if (!confirmar) return;

    sessionStorage.removeItem('token');
    sessionStorage.removeItem('cpf');
    localStorage.removeItem('token');
    localStorage.removeItem('cpf');

    usuarioLogado = null;
    location.reload();
}

function showApp() {
    document.getElementById('loginView').classList.add('d-none');
    document.getElementById('appView').classList.remove('d-none');
    document.getElementById('mainNavbar').classList.remove('d-none');
    carregarDespesas();
    carregarUsuarios();
    carregarMoedas();
    carregarTotalGeral();
    carregarTotalPorMoeda();
}

/* ================= CRUD ================= */

function addDespesa() {
    const descricao = document.getElementById('despesaDescricao').value;
    const valor = document.getElementById('despesaValor').value;
    const tipo = document.getElementById('despesaTipo').value;
    const comentario = document.getElementById('despesaComentario').value;
    const dataDespesa = document.getElementById('despesaData').value;
    const dataIsoDespesa = new Date(dataDespesa).toISOString();
    const cpf = getCpfFromToken();
    const despesa = {
        nome: descricao,
        valor: parseFloat(valor),
        tipo: tipo,
        data_despesa: dataIsoDespesa,
        comentario: comentario,
        cpf: cpf
    };

    console.log(despesa);

    const method = editId ? 'PUT' : 'POST';
    const url = editId
        ? `${baseUrl}/despesas/${editId}`
        : `${baseUrl}/despesas/criar`;

    fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(despesa)
    })
    .then(res => {
        if (!res.ok) throw new Error('Erro ao salvar despesa');
        editId = null;
        clearForm();
        document.querySelector('#formTitle').innerText = 'Nova Despesa';
        document.querySelector('#despesaFormButton').innerText = 'Salvar';
        carregarDespesas();
    })
    .catch(err => alert(err.message));
}

function editDespesa(id) {
    const d = despesas.find(x => x.id === id);
    console.log(d);
    if (!d) return alert('Despesa não encontrada');
    const cpfToken = getCpfFromToken();
    console.log(d.cpf+':'+cpfToken);
    if(d.cpf !== cpfToken) return alert('Somente usuário responsável pode editar a despesa.\n Favor contactar usuário responsável.');
    // Preenche o formulário
    document.getElementById('despesaDescricao').value = d.nome;
    document.getElementById('despesaValor').value = d.valor;
    document.getElementById('despesaTipo').value = d.tipo;
    document.getElementById('despesaData').value = d.data_despesa
        ? new Date(d.data_despesa).toISOString().split('T')[0]
        : '';
    document.getElementById('despesaComentario').value = d.comentario || '';

    // Marca a despesa que está sendo editada
    editId = id;

    // Opcional: muda o texto do botão e do título
    document.querySelector('#formTitle').innerText = 'Editar Despesa';
    document.querySelector('#despesaFormButton').innerText = 'Salvar Alterações';
}

function removeDespesa(id) {
    const d = despesas.find(x => x.id === id);
    const cpfToken = getCpfFromToken();
    if(d.cpf !== cpfToken) return alert('Somente usuário responsável pode editar a despesa.\n Favor contactar usuário responsável.');

    fetch(`${baseUrl}/despesas/${id}`, { method: 'DELETE', headers: authHeaders() })
        .then(() => carregarDespesas())
        .catch(err => alert('Erro ao deletar despesa'));
}

/* ================= FILTRO ================= */

function filterTipo(tipo) {
    render(tipo);
}

/* ================= RENDER ================= */

function getMoedaLabel(moeda) {
    const map = {
        BRL: 'R$',
        USD: 'US$',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
        CAD: 'C$',
        AUD: 'A$',
        CHF: 'CHF',
        CNY: '¥',
        HKD: 'HK$',
        CZK: 'Kč',
        DKK: 'kr',
        HUF: 'Ft',
        IDR: 'Rp',
        ILS: '₪',
        INR: '₹',
        ISK: 'kr',
        KRW: '₩',
        MXN: 'MX$',
        NOK: 'kr',
        NZD: 'NZ$',
        PLN: 'zł',
        SEK: 'kr',
        SGD: 'S$',
        TRY: '₺',
        ZAR: 'R'
    };

    return map[moeda?.toUpperCase()] || moeda?.toUpperCase() || 'R$';
}

function formatCurrency(value, moeda = 'BRL') {
    const numero = Number(value || 0);
    const label = getMoedaLabel(moeda);
    return `${label} ${numero.toFixed(2)}`;
}

function sortDespesaByMoeda(a, b) {
    const moedaOrder = (moeda) => {
        if (moeda === 'BRL') return 0;
        return 1;
    };

    const order = moedaOrder(a.moeda) - moedaOrder(b.moeda);
    if (order !== 0) return order;
    return (a.moeda || '').localeCompare(b.moeda || '');
}

function render(filtroTipo = '') {
    const lista = document.getElementById('lista');
    lista.innerHTML = '';

    let total = 0;

    const despesasFiltradas = [...despesas]
        .filter(d => !filtroTipo || d.tipo === filtroTipo)
        .sort(sortDespesaByMoeda);

    despesasFiltradas.forEach(d => {
        total += d.valor;
        const data = new Date(d.data_despesa);
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        const dataFormatada = `${dia}/${mes}/${ano}`;
        lista.innerHTML += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${d.nome}</strong><br>
                    <small>${d.tipo} | ${d.responsavel || d.cpf} | ${dataFormatada} | ${d.moeda || 'BRL'}</small>
                    ${d.comentario ? `
                        <span class="custom-tooltip">
                            <img
                                src="img/question-mark-svgrepo-com.svg"
                                alt="Comentário"
                                class="custom-tooltip-icon"
                            />
                        <span class="custom-tooltiptext">${d.comentario}</span>
                        </span>` : ''}
                </div>
                <div>
                    ${formatCurrency(d.valor, d.moeda || 'BRL')}
                    <button class="btn btn-sm btn-warning ms-1" onclick="editDespesa(${d.id})">✏️</button>
                    <button class="btn btn-sm btn-danger ms-1" onclick="removeDespesa(${d.id})">🗑️</button>
                </div>
            </li>
        `;
    });

    document.getElementById('total').innerText = formatCurrency(total, 'BRL');
    renderPorTipo();
    renderPorUsuario();
}

function carregarDespesas() {
    fetch(`${baseUrl}/despesas/getallexpenses`)
        .then(res => res.json())
        .then(data => {
            despesas = data.despesas;
            render();
        })
        .catch(err => alert('Erro ao carregar despesas'));
}

function carregarTotalGeral() {
    fetch(`${baseUrl}/despesas/total/conversao`)
        .then(res => res.json())
        .then(data => {
            const total = (data.totais || []).reduce((acc, item) => acc + Number(item.totalConvertido || 0), 0);
            document.getElementById('total').innerText = formatCurrency(total, 'BRL');
        })
        .catch(err => alert('Erro ao carregar total geral: ' + err));
}

function carregarTotalPorMoeda() {
    fetch(`${baseUrl}/despesas/total/moedas`)
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('totalMoedaSelecionada');
            if (!select) return;

            select.innerHTML = '';
            const moedas = (data.totais || []).map(item => item.moeda).sort((a, b) => {
                if (a === 'BRL') return -1;
                if (b === 'BRL') return 1;
                return a.localeCompare(b);
            });

            moedas.forEach(moeda => {
                const option = document.createElement('option');
                option.value = moeda;
                option.textContent = moeda;
                select.appendChild(option);
            });

            if (moedas.length) {
                select.value = moedas.includes('BRL') ? 'BRL' : moedas[0];
                atualizarTotalMoedaSelecionada();
            }

            select.onchange = atualizarTotalMoedaSelecionada;
        })
        .catch(err => alert('Erro ao carregar totais por moeda: ' + err));
}

function atualizarTotalMoedaSelecionada() {
    const select = document.getElementById('totalMoedaSelecionada');
    const output = document.getElementById('totalMoedaAtual');
    if (!select || !output) return;

    const moeda = select.value;
    if (!moeda) {
        output.innerText = '-';
        return;
    }

    fetch(`${baseUrl}/despesas/total/moeda/${encodeURIComponent(moeda)}`)
        .then(res => res.json())
        .then(data => {
            output.innerText = formatCurrency(data.total || 0, data.moeda || moeda);
        })
        .catch(err => {
            output.innerText = 'Erro';
            console.error(err);
        });
}

function carregarMoedas() {
    fetch(`${baseUrl}/despesas/moedas`)
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('despesaMoeda');
            select.innerHTML = '';
            const moedas = data.moedas || Object.keys(data);
            moedas.forEach(codigo => {
                const option = document.createElement('option');
                option.value = codigo;
                option.textContent = codigo;
                select.appendChild(option);
            });
        })
        .catch(err => alert('Erro ao carregar moedas: ' + err));
}

/* ================= DASHBOARD ================= */

function renderPorTipo() {
    const ul = document.getElementById('porTipo');
    ul.innerHTML = '';
    const resumo = {};

    despesas.forEach(d => {
        const chave = `${d.tipo}|${d.moeda || 'BRL'}`;
        resumo[chave] = (resumo[chave] || 0) + d.valor;
    });

    const entradas = Object.entries(resumo)
        .map(([chave, valor]) => {
            const [tipo, moeda] = chave.split('|');
            return { tipo, moeda, valor };
        })
        .sort((a, b) => {
            if (a.moeda === 'BRL' && b.moeda !== 'BRL') return -1;
            if (a.moeda !== 'BRL' && b.moeda === 'BRL') return 1;
            return a.moeda.localeCompare(b.moeda) || a.tipo.localeCompare(b.tipo);
        });

    entradas.forEach(item => {
        ul.innerHTML += `<li class="list-group-item">${item.tipo} (${item.moeda}): ${formatCurrency(item.valor, item.moeda)}</li>`;
    });
}

function renderPorUsuario() {
    const ul = document.getElementById('porUsuario');
    ul.innerHTML = '';
    const resumo = {};

    despesas.forEach(d => {
        const chave = `${d.responsavel || d.cpf}|${d.moeda || 'BRL'}`;
        resumo[chave] = (resumo[chave] || 0) + d.valor;
    });

    const entradas = Object.entries(resumo)
        .map(([chave, valor]) => {
            const [usuario, moeda] = chave.split('|');
            return { usuario, moeda, valor };
        })
        .sort((a, b) => {
            if (a.moeda === 'BRL' && b.moeda !== 'BRL') return -1;
            if (a.moeda !== 'BRL' && b.moeda === 'BRL') return 1;
            return a.moeda.localeCompare(b.moeda) || a.usuario.localeCompare(b.usuario);
        });

    entradas.forEach(item => {
        ul.innerHTML += `<li class="list-group-item">${item.usuario} (${item.moeda}): ${formatCurrency(item.valor, item.moeda)}</li>`;
    });
}

/* ================= UTIL ================= */

function clearForm() {
    document.getElementById('despesaDescricao').value = '';
    document.getElementById('despesaValor').value = '';
    document.getElementById('despesaTipo').value = '';
    document.getElementById('despesaData').value = '';
    document.getElementById('despesaComentario').value = '';
}

function ClearFormUsers() {
    document.getElementById('usuarioNome').value = '';
    document.getElementById('usuarioCpf').value = '';
    document.getElementById('usuarioEmail').value = '';
    document.getElementById('usuarioData').value = '';
}

function getCpfFromToken() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.cpf || null;
    } catch (e) {
        console.error('Erro ao decodificar token', e);
        return null;
    }
}

/* ================= SCROLL SUAVE NAVBAR ================= */
document.querySelectorAll('.navbar-nav a').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

/* ================= CRUD USUÁRIOS ================= */

function carregarUsuarios() {
    fetch(`${baseUrl}/usuarios`)
        .then(res => res.json())
        .then(data => {
            const lista = document.getElementById('listaUsuarios');
            lista.innerHTML = '';
            const usuarios = data.usuarios || [];
            usuarios.forEach(u => {
                lista.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${u.nome}</strong> | ${u.cpf} | ${u.email}
                        </div>
                        <div>
                            <button class="btn btn-sm btn-warning ms-1" onclick="editarUsuario('${u.cpf}')">✏️</button>
                            <button class="btn btn-sm btn-danger ms-1" onclick="removerUsuario('${u.cpf}')">🗑️</button>
                        </div>
                    </li>
                `;
            });
        })
        .catch(err => alert('Erro ao carregar usuários - message:'+err));
}

function salvarUsuario() {
    const nome = document.getElementById('usuarioNome').value;
    const cpf = document.getElementById('usuarioCpf').value;
    const email = document.getElementById('usuarioEmail').value;

    const method = editUsuarioCpf ? 'PUT' : 'POST';
    const url = editUsuarioCpf
        ? `${baseUrl}/usuarios/${editUsuarioCpf}`
        : `${baseUrl}/usuarios/cadastrar`;

    fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({
            nome,
            cpf,
            email
        })
    })
    .then(res => {
        if (!res.ok) throw new Error('Erro ao salvar usuário');
        alert('Usuário salvo com sucesso');
        ClearFormUsers();
        editUsuarioCpf = null;
        carregarUsuarios();
    })
    .catch(err => alert(err.message));
}

function editarUsuario(cpf) {
    const cpfToken = getCpfFromToken();
    if (cpf !== cpfToken) {
        return alert('Somente o próprio usuário pode editar seus dados.');
    }

    fetch(`${baseUrl}/usuarios/${cpf}`, {
        headers: authHeaders()
    })
    .then(res => res.json())
    .then(u => {
        document.getElementById('usuarioNome').value = u.nome;
        document.getElementById('usuarioCpf').value = u.cpf;
        document.getElementById('usuarioEmail').value = u.email;
        document.getElementById('usuarioData').value =
            u.data_nascimento?.split('T')[0] || '';

        editUsuarioCpf = cpf; //marca edição
    })
    .catch(err => alert('Erro ao carregar usuário'));
}


function removerUsuario(cpf) {
    const cpfToken = getCpfFromToken();
    if(cpf !== cpfToken) return alert('Somente usuário responsável pode remover seus dados.\n Favor contactar usuário responsável.');
    fetch(`${baseUrl}/usuarios/${cpf}`, { method: 'DELETE', headers: authHeaders() })
        .then(() => carregarUsuarios())
        .catch(err => alert('Erro ao remover usuário'));
}

/* ================ HEADER ================ */

function authHeaders() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}


/* ================= INIT ================= */
usuarioLogado = localStorage.getItem('usuario');
cpfLogado = localStorage.getItem('cpf');

if (usuarioLogado && cpfLogado) showApp();

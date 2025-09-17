const apiBaseUrl = 'http://localhost:5000/api';

const transactionForm = document.getElementById('transactionForm');
const transactionsTableBody = document.querySelector('#transactionsTable tbody');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const balanceEl = document.getElementById('balance');
const searchInput = document.getElementById('searchInput');
const incomeExpenseChartCtx = document.getElementById('incomeExpenseChart').getContext('2d');
const groupForm = document.getElementById('groupForm');
const groupsList = document.getElementById('groupsList');
const groupDetailsSection = document.getElementById('groupDetailsSection');

let transactions = [];
let groups = [];
let incomeExpenseChart;
let selectedGroupId = null;

// Fetch and display transactions and groups on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchTransactions();
    fetchGroups();
});

// Fetch transactions from backend
async function fetchTransactions() {
    try {
        const res = await fetch(`${apiBaseUrl}/transactions`);
        transactions = await res.json();
        displayTransactions(transactions);
        updateDashboard(transactions);
        updateChart(transactions);
    } catch (err) {
        alert('Error fetching transactions');
    }
}

// Display transactions in table
function displayTransactions(transactionsList) {
    transactionsTableBody.innerHTML = '';
    transactionsList.forEach(tx => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${capitalize(tx.type)}</td>
      <td>${tx.category}</td>
      <td>${tx.amount.toFixed(2)}</td>
      <td>${new Date(tx.date).toLocaleDateString()}</td>
      <td>${tx.notes || ''}</td>
      <td><button onclick="deleteTransaction('${tx._id}')">Delete</button></td>
    `;
        transactionsTableBody.appendChild(tr);
    });
}

// Capitalize first letter
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Update dashboard stats
function updateDashboard(transactionsList) {
    const totalIncome = transactionsList.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactionsList.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const balance = totalIncome - totalExpense;

    totalIncomeEl.textContent = `$${totalIncome.toFixed(2)}`;
    totalExpenseEl.textContent = `$${totalExpense.toFixed(2)}`;
    balanceEl.textContent = `$${balance.toFixed(2)}`;
}

// Add transaction form submit handler
transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newTransaction = {
        type: transactionForm.type.value,
        category: transactionForm.category.value.trim(),
        amount: parseFloat(transactionForm.amount.value),
        date: transactionForm.date.value,
        notes: transactionForm.notes.value.trim()
    };
    try {
        const res = await fetch(`${apiBaseUrl}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTransaction)
        });
        if (res.ok) {
            transactionForm.reset();
            fetchTransactions();
        } else {
            alert('Failed to add transaction');
        }
    } catch (err) {
        alert('Error adding transaction');
    }
});

// Delete transaction by id
async function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
        const res = await fetch(`${apiBaseUrl}/transactions/${id}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            fetchTransactions();
        } else {
            alert('Failed to delete transaction');
        }
    } catch (err) {
        alert('Error deleting transaction');
    }
}

// Search filter on transactions table
searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const filtered = transactions.filter(tx =>
        tx.type.toLowerCase().includes(query) ||
        tx.category.toLowerCase().includes(query) ||
        (tx.notes && tx.notes.toLowerCase().includes(query)) ||
        new Date(tx.date).toLocaleDateString().includes(query)
    );
    displayTransactions(filtered);
    updateDashboard(filtered);
    updateChart(filtered);
});

// Chart update function
function updateChart(transactionsList) {
    const incomeByDate = {};
    const expenseByDate = {};

    transactionsList.forEach(t => {
        const dateKey = new Date(t.date).toLocaleDateString();
        if (t.type === 'income') {
            incomeByDate[dateKey] = (incomeByDate[dateKey] || 0) + t.amount;
        } else {
            expenseByDate[dateKey] = (expenseByDate[dateKey] || 0) + t.amount;
        }
    });

    const allDates = Array.from(new Set([...Object.keys(incomeByDate), ...Object.keys(expenseByDate)]))
        .sort((a, b) => new Date(a) - new Date(b));

    const incomeData = allDates.map(d => incomeByDate[d] || 0);
    const expenseData = allDates.map(d => expenseByDate[d] || 0);

    if (incomeExpenseChart) incomeExpenseChart.destroy();

    incomeExpenseChart = new Chart(incomeExpenseChartCtx, {
        type: 'line',
        data: {
            labels: allDates,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: 'green',
                    fill: false
                },
                {
                    label: 'Expense',
                    data: expenseData,
                    borderColor: 'red',
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Amount ($)'
                    }
                }
            }
        }
    });
}

// Group form submission
groupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const groupName = groupForm.groupName.value.trim();
    const participantsRaw = groupForm.participants.value.trim();
    if (!groupName || !participantsRaw) {
        alert('Please fill group name and participants');
        return;
    }
    try {
        const res = await fetch(`${apiBaseUrl}/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: groupName, participants: participantsRaw })
        });
        if (res.ok) {
            groupForm.reset();
            fetchGroups();
        } else {
            alert('Failed to create group');
        }
    } catch (err) {
        alert('Error creating group');
    }
});

// Fetch and display groups
async function fetchGroups() {
    try {
        const res = await fetch(`${apiBaseUrl}/groups`);
        groups = await res.json();
        displayGroups(groups);
    } catch (err) {
        alert('Error fetching groups');
    }
}

// Display groups list with clickable functionality
function displayGroups(groupsListData) {
    if (groupsListData.length === 0) {
        groupsList.innerHTML = '<p>No groups created yet.</p>';
        return;
    }

    let html = '<ul>';
    groupsListData.forEach(g => {
        html += `<li data-group-id="${g._id}" style="cursor:pointer; text-decoration:underline; color:blue;">${g.name} - Participants: ${g.participants.join(', ')}</li>`;
    });
    html += '</ul>';
    groupsList.innerHTML = html;
}

// Click on group to load group details
groupsList.addEventListener('click', e => {
    const target = e.target;
    if (target.tagName === 'LI' && target.dataset.groupId) {
        fetchGroupDetails(target.dataset.groupId);
    }
});

// Fetch group details including expenses and settlements
async function fetchGroupDetails(groupId) {
    try {
        const res = await fetch(`${apiBaseUrl}/groups/${groupId}`);
        if (!res.ok) throw new Error('Failed to fetch group');
        const group = await res.json();
        selectedGroupId = groupId;
        displayGroupDetails(group);
    } catch (err) {
        alert(err.message);
    }
}

// Display group details and UI for expenses, settlements & balances
function displayGroupDetails(group) {
    groupDetailsSection.innerHTML = `
    <h2>Group: ${group.name}</h2>
    <h3>Participants: ${group.participants.join(', ')}</h3>
    <div>
      <h4>Add Expense</h4>
      <form id="addExpenseForm">
        <input type="text" id="expenseDescription" placeholder="Description" required />
        <input type="number" id="expenseAmount" placeholder="Amount" required min="0.01" step="0.01" />
        <select id="expensePaidBy" required>${group.participants.map(p => `<option value="${p}">${p}</option>`).join('')}</select>
        <label>Split between (select participants and enter amounts):</label>
        <div id="splitParticipants"></div>
        <button type="submit">Add Expense</button>
      </form>
    </div>
    <div>
      <h4>Add Settlement</h4>
      <form id="addSettlementForm">
        <select id="settlementFrom" required>${group.participants.map(p => `<option value="${p}">${p}</option>`).join('')}</select>
        <select id="settlementTo" required>${group.participants.map(p => `<option value="${p}">${p}</option>`).join('')}</select>
        <input type="number" id="settlementAmount" placeholder="Amount" required min="0.01" step="0.01" />
        <button type="submit">Add Settlement</button>
      </form>
    </div>
    <div>
      <h4>Expenses</h4>
      <ul>${group.expenses.map(e => `<li>${e.description}: $${e.amount.toFixed(2)} paid by ${e.paidBy}</li>`).join('') || 'No expenses added.'}</ul>
    </div>
    <div>
      <h4>Settlements</h4>
      <ul>${group.settlements.map(s => `<li>${s.from} paid ${s.to}: $${s.amount.toFixed(2)}</li>`).join('') || 'No settlements added.'}</ul>
    </div>
    <div>
      <h4>Balances</h4>
      <ul>${calculateBalances(group).map(b => `<li>${b.participant}: ${b.balance >= 0 ? 'Owed $' : 'Owes $'}${Math.abs(b.balance).toFixed(2)}</li>`).join('')}</ul>
    </div>
  `;

    setupSplitParticipantsInputs(group.participants);
    setupExpenseForm();
    setupSettlementForm();
}

// Setup split participants inputs with amount input for each
function setupSplitParticipantsInputs(participants) {
    const container = document.getElementById('splitParticipants');
    container.innerHTML = '';
    participants.forEach(p => {
        const div = document.createElement('div');
        div.style.marginBottom = '5px';
        div.innerHTML = `<label><input type="checkbox" value="${p}" checked /> ${p}</label> 
                     <input type="number" min="0" step="0.01" placeholder="Amount" value="0" style="width: 100px;" />`;
        container.appendChild(div);
    });
}

// Handle add expense form submission
function setupExpenseForm() {
    const form = document.getElementById('addExpenseForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const description = document.getElementById('expenseDescription').value.trim();
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const paidBy = document.getElementById('expensePaidBy').value;

        const checkedDivs = Array.from(document.getElementById('splitParticipants').children)
            .filter(div => div.querySelector('input[type="checkbox"]').checked);
        const splitBetween = checkedDivs.map(div => div.querySelector('input[type="checkbox"]').value);
        const splitAmounts = checkedDivs.map(div => parseFloat(div.querySelector('input[type="number"]').value) || 0);

        if (!description || amount <= 0 || splitBetween.length === 0 || Math.abs(splitAmounts.reduce((a, b) => a + b, 0) - amount) > 0.01) {
            alert('Please enter valid data. Sum of split amounts must equal total amount.');
            return;
        }

        try {
            const res = await fetch(`${apiBaseUrl}/groups/${selectedGroupId}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, amount, paidBy, splitBetween, splitAmounts, date: new Date() })
            });
            if (!res.ok) throw new Error('Failed to add expense');
            alert('Expense added successfully');
            fetchGroupDetails(selectedGroupId);
        } catch (err) {
            alert(err.message);
        }
    };
}

// Handle add settlement form submission
function setupSettlementForm() {
    const form = document.getElementById('addSettlementForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const from = document.getElementById('settlementFrom').value;
        const to = document.getElementById('settlementTo').value;
        const amount = parseFloat(document.getElementById('settlementAmount').value);
        if (from === to) {
            alert('From and To cannot be the same participant');
            return;
        }
        if (amount <= 0) {
            alert('Enter a valid amount');
            return;
        }
        try {
            const res = await fetch(`${apiBaseUrl}/groups/${selectedGroupId}/settlements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from, to, amount, date: new Date() })
            });
            if (!res.ok) throw new Error('Failed to add settlement');
            alert('Settlement added successfully');
            fetchGroupDetails(selectedGroupId);
        } catch (err) {
            alert(err.message);
        }
    };
}

// Calculate balances: positive = owed money, negative = owes money
function calculateBalances(group) {
    const balances = {};
    group.participants.forEach(p => balances[p] = 0);

    group.expenses.forEach(e => {
        balances[e.paidBy] += e.amount;
        e.splitBetween.forEach((p, i) => {
            balances[p] -= e.splitAmounts[i];
        });
    });

    group.settlements.forEach(s => {
        balances[s.from] += s.amount;
        balances[s.to] -= s.amount;
    });

    return Object.entries(balances).map(([participant, balance]) => ({ participant, balance }));
}

document.addEventListener('DOMContentLoaded', () => {
    // --- State & Constants ---
    let currentDate = new Date();
    let clients = JSON.parse(localStorage.getItem('aquapp_clients')) || ['Cliente Ejemplo A', 'Cliente Ejemplo B'];
    let calendarEntries = JSON.parse(localStorage.getItem('aquapp_entries')) || {};
    let delegatedClients = JSON.parse(localStorage.getItem('aquapp_delegated')) || [];
    // Format: { 'YYYY-MM-DD': [{ id, name, status }, ...] }

    // --- DOM Elements ---
    const calendarDays = document.getElementById('calendar-days');
    const monthYearText = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const clientsList = document.getElementById('clients-list');
    const newClientInput = document.getElementById('new-client-name');
    const addClientBtn = document.getElementById('add-client-btn');
    const saveIndicator = document.getElementById('save-indicator');
    const clearMonthBtn = document.getElementById('clear-month');
    const printBtn = document.getElementById('print-btn');

    // Import Modal Elements
    const importModal = document.getElementById('import-modal');
    const openImportBtn = document.getElementById('open-import-btn');
    const closeImportBtn = document.getElementById('close-import-modal');
    const confirmImportBtn = document.getElementById('confirm-import-btn');
    const importTextarea = document.getElementById('import-textarea');

    // Backup Elements
    const exportBackupBtn = document.getElementById('export-backup-btn');
    const importBackupBtn = document.getElementById('import-backup-btn');
    const backupFileInput = document.getElementById('backup-file-input');

    // --- Initialization ---
    function init() {
        renderCalendar();
        renderSidebarClients();
        setupEventListeners();
        if (window.lucide) lucide.createIcons();
    }

    // --- Calendar Logic ---
    function renderCalendar() {
        calendarDays.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Header text
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        monthYearText.innerText = `${monthNames[month]} ${year}`;

        // Get first day of month (0 = Sun, 1 = Mon...)
        let firstDayOfMonth = new Date(year, month, 1).getDay();
        // Adjust to Mon-Sun (Mon=0, Sun=6)
        firstDayOfMonth = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();

        // Calculate total cells needed (usually 35 or 42)
        const totalCells = (firstDayOfMonth + daysInMonth) > 35 ? 42 : 35;

        for (let i = 0; i < totalCells; i++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('day-cell');

            let dayNumber;
            let cellDate;

            if (i < firstDayOfMonth) {
                // Days from prev month
                dayNumber = prevMonthDays - firstDayOfMonth + i + 1;
                dayCell.classList.add('other-month');
                cellDate = new Date(year, month - 1, dayNumber);
            } else if (i < firstDayOfMonth + daysInMonth) {
                // Days from current month
                dayNumber = i - firstDayOfMonth + 1;
                cellDate = new Date(year, month, dayNumber);

                // Today check
                const today = new Date();
                if (dayNumber === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                    dayCell.classList.add('today');
                }
            } else {
                // Days from next month
                dayNumber = i - (firstDayOfMonth + daysInMonth) + 1;
                dayCell.classList.add('other-month');
                cellDate = new Date(year, month + 1, dayNumber);
            }

            // Flag Weekends (Saturday=6, Sunday=0 in JS dates)
            const dayOfWeek = cellDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                dayCell.classList.add('weekend');
            }

            const dateStr = formatDate(cellDate);
            dayCell.innerHTML = `<span class="day-number">${dayNumber}</span>`;
            dayCell.dataset.date = dateStr;

            // Render entries for this day
            const entries = calendarEntries[dateStr] || [];
            entries.forEach(entry => {
                const pill = createClientPill(entry.name, entry.status, true, entry.id);
                dayCell.appendChild(pill);
            });

            // Drag and Drop Events for Day Cell
            dayCell.addEventListener('dragover', e => {
                e.preventDefault();
                dayCell.classList.add('drag-over');
            });

            dayCell.addEventListener('dragleave', () => {
                dayCell.classList.remove('drag-over');
            });

            dayCell.addEventListener('drop', e => {
                e.preventDefault();
                dayCell.classList.remove('drag-over');
                const clientData = JSON.parse(e.dataTransfer.getData('text/plain'));
                handleDrop(dateStr, clientData);
            });

            calendarDays.appendChild(dayCell);
        }
        if (window.lucide) lucide.createIcons();
    }

    // --- Sidebar Logic ---
    function renderSidebarClients() {
        clientsList.innerHTML = '';

        // Get all clients already scheduled in the CURRENTLY VIEWED month
        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const monthPrefix = `${year}-${month}`;

        const scheduledInMonth = new Set();
        Object.keys(calendarEntries).forEach(date => {
            if (date.startsWith(monthPrefix)) {
                calendarEntries[date].forEach(entry => scheduledInMonth.add(entry.name));
            }
        });

        // Show only clients NOT scheduled in this month AND NOT delegated
        const filteredClients = clients.filter(clientName => !scheduledInMonth.has(clientName) && !delegatedClients.includes(clientName));

        if (filteredClients.length === 0 && clients.length > 0) {
            clientsList.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; margin-top: 20px;">Todos los pendientes están asignados / delegados.</p>';
        } else {
            filteredClients.forEach(clientName => {
                const pill = createClientPill(clientName, 'pending', false);
                clientsList.appendChild(pill);
            });
        }

        // Render delegated
        const delegatedList = document.getElementById('delegated-list');
        if (delegatedList) {
            delegatedList.innerHTML = '';
            delegatedClients.forEach(clientName => {
                const pill = createClientPill(clientName, 'done', false);
                delegatedList.appendChild(pill);
            });
        }
    }

    function createClientPill(name, status, isCalendarPill = false, id = null) {
        const pill = document.createElement('div');
        pill.classList.add('client-pill');
        pill.classList.add(status === 'pending' ? 'pill-pending' : 'pill-done');
        pill.setAttribute('draggable', 'true');
        pill.innerText = name;

        const pillId = id || Date.now() + Math.random().toString(36).substr(2, 9);
        pill.dataset.id = pillId;
        pill.dataset.name = name;
        pill.dataset.status = status;

        // Action icons for calendar pills
        if (isCalendarPill) {
            const removeIcon = document.createElement('div');
            removeIcon.classList.add('pill-remove');
            removeIcon.innerHTML = '✕';
            removeIcon.title = "Eliminar";
            removeIcon.onclick = (e) => {
                e.stopPropagation();
                removeEntry(pill.closest('.day-cell').dataset.date, pillId);
            };
            pill.appendChild(removeIcon);

            // Toggle status on click
            pill.onclick = () => {
                const date = pill.closest('.day-cell').dataset.date;
                toggleStatus(date, pillId);
            };
        } else {
            // Sidebar pills have a delete option too
            pill.oncontextmenu = (e) => {
                e.preventDefault();
                if (confirm(`¿Eliminar a "${name}" de la lista total de clientes?`)) {
                    clients = clients.filter(c => c !== name);
                    delegatedClients = delegatedClients.filter(c => c !== name);
                    saveState();
                    renderSidebarClients();
                }
            };
        }

        pill.addEventListener('dragstart', e => {
            pill.classList.add('dragging');
            let source = 'sidebar';
            if (isCalendarPill) source = pill.closest('.day-cell').dataset.date;
            else if (pill.closest('#delegated-list')) source = 'delegated';

            const data = {
                id: pillId,
                name: name,
                status: status,
                source: source
            };
            e.dataTransfer.setData('text/plain', JSON.stringify(data));
        });

        pill.addEventListener('dragend', () => {
            pill.classList.remove('dragging');
        });

        return pill;
    }

    // --- Interactions & State Management ---

    function handleDrop(date, data) {
        // If moving from another day or sidebar/delegated, remove from old day first
        if (data.source !== 'sidebar' && data.source !== 'delegated' && data.source !== date) {
            removeEntry(data.source, data.id, false); // false = don't re-render yet
        }
        
        // Ensure not in delegated anymore
        if (data.source === 'delegated') {
            delegatedClients = delegatedClients.filter(c => c !== data.name);
        }

        if (!calendarEntries[date]) calendarEntries[date] = [];

        // Add new entry
        calendarEntries[date].push({
            id: data.id || Date.now().toString(),
            name: data.name,
            status: data.status || 'pending'
        });

        saveState();
        renderCalendar();
        renderSidebarClients(); // Update sidebar when drop happens
    }

    function handleSidebarDrop(zoneId, data) {
        // If coming from calendar:
        if (data.source !== 'sidebar' && data.source !== 'delegated') {
            removeEntry(data.source, data.id, false);
        }

        // If dropping into pending, remove from delegated
        if (zoneId === 'clients-list') {
            delegatedClients = delegatedClients.filter(c => c !== data.name);
        }

        // If dropping into delegated, add to delegated
        if (zoneId === 'delegated-list') {
            if (!delegatedClients.includes(data.name)) {
                delegatedClients.push(data.name);
            }
        }

        saveState();
        renderCalendar();
        renderSidebarClients();
    }

    function removeEntry(date, id, shouldRender = true) {
        if (calendarEntries[date]) {
            calendarEntries[date] = calendarEntries[date].filter(e => e.id !== id);
            if (calendarEntries[date].length === 0) delete calendarEntries[date];
        }
        saveState();
        if (shouldRender) {
            renderCalendar();
            renderSidebarClients(); // Update sidebar when removed from calendar
        }
    }

    function toggleStatus(date, id) {
        if (calendarEntries[date]) {
            const entry = calendarEntries[date].find(e => e.id === id);
            if (entry) {
                entry.status = entry.status === 'pending' ? 'done' : 'pending';
                saveState();
                renderCalendar();
            }
        }
    }

    function saveState() {
        localStorage.setItem('aquapp_clients', JSON.stringify(clients));
        localStorage.setItem('aquapp_entries', JSON.stringify(calendarEntries));
        localStorage.setItem('aquapp_delegated', JSON.stringify(delegatedClients));

        // Visual indicator
        saveIndicator.classList.add('visible');
        setTimeout(() => saveIndicator.classList.remove('visible'), 2000);
    }

    function formatDate(date) {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    }

    function setupEventListeners() {
        prevMonthBtn.onclick = () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
            renderSidebarClients(); // Re-filter sidebar for new month
        };

        nextMonthBtn.onclick = () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
            renderSidebarClients(); // Re-filter sidebar for new month
        };

        addClientBtn.onclick = () => {
            const name = newClientInput.value.trim();
            if (name && !clients.includes(name)) {
                clients.push(name);
                newClientInput.value = '';
                saveState();
                renderSidebarClients();
            }
        };

        const delegatedList = document.getElementById('delegated-list');
        const clientsListZone = document.getElementById('clients-list');

        [delegatedList, clientsListZone].forEach(zone => {
            if(!zone) return;
            zone.addEventListener('dragover', e => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });
            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });
            zone.addEventListener('drop', e => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                handleSidebarDrop(zone.id, data);
            });
        });

        // Bulk Import Listeners
        openImportBtn.onclick = () => {
            importModal.style.display = 'flex';
            importTextarea.focus();
        };

        closeImportBtn.onclick = () => {
            importModal.style.display = 'none';
        };

        confirmImportBtn.onclick = () => {
            const text = importTextarea.value;
            const newNames = text.split('\n')
                .map(n => n.trim())
                .filter(n => n !== '' && !clients.includes(n));

            if (newNames.length > 0) {
                clients = [...clients, ...newNames];
                saveState();
                renderSidebarClients();
                importTextarea.value = '';
                importModal.style.display = 'none';
            } else {
                importModal.style.display = 'none';
            }
        };

        // Close modal on click outside
        importModal.onclick = (e) => {
            if (e.target === importModal) closeImportBtn.click();
        };

        newClientInput.onkeypress = (e) => {
            if (e.key === 'Enter') addClientBtn.click();
        };

        clearMonthBtn.onclick = () => {
            if (confirm('¿Estás seguro de que quieres limpiar toda la organización de este mes?')) {
                const year = currentDate.getFullYear();
                const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
                const prefix = `${year}-${month}`;

                Object.keys(calendarEntries).forEach(date => {
                    if (date.startsWith(prefix)) {
                        delete calendarEntries[date];
                    }
                });
                saveState();
                renderCalendar();
            }
        };

        if (exportBackupBtn) {
            exportBackupBtn.onclick = () => {
                const data = {
                    aquapp_clients: clients,
                    aquapp_entries: calendarEntries,
                    aquapp_delegated: delegatedClients
                };
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                
                const date = new Date();
                const dateStr = date.toISOString().split('T')[0];
                downloadAnchorNode.setAttribute("download", "aquapp_backup_" + dateStr + ".json");
                
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            };
        }

        if (importBackupBtn && backupFileInput) {
            importBackupBtn.onclick = () => {
                backupFileInput.click();
            };

            backupFileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        
                        if (importedData.aquapp_clients || importedData.aquapp_entries || importedData.aquapp_delegated) {
                            if (confirm('¿Estás seguro de que quieres sobreescribir todos los datos actuales con esta copia de seguridad? Esta acción no se puede deshacer.')) {
                                if (importedData.aquapp_clients) {
                                    clients = importedData.aquapp_clients;
                                    localStorage.setItem('aquapp_clients', JSON.stringify(clients));
                                }
                                if (importedData.aquapp_entries) {
                                    calendarEntries = importedData.aquapp_entries;
                                    localStorage.setItem('aquapp_entries', JSON.stringify(calendarEntries));
                                }
                                if (importedData.aquapp_delegated) {
                                    delegatedClients = importedData.aquapp_delegated;
                                    localStorage.setItem('aquapp_delegated', JSON.stringify(delegatedClients));
                                }
                                
                                alert('Datos importados correctamente. La página se recargará para aplicar los cambios.');
                                window.location.reload();
                            }
                        } else {
                            alert('El archivo no parece ser una copia de seguridad válida de Aquapp Planner.');
                        }
                    } catch (error) {
                        alert('Error al leer el archivo. Asegúrate de que es un archivo .json válido.');
                    }
                    backupFileInput.value = '';
                };
                reader.readAsText(file);
            });
        }

        printBtn.onclick = () => {
            window.print();
        };
    }

    init();
});

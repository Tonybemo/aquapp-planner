document.addEventListener('DOMContentLoaded', () => {
    // --- State & Constants ---
    const SUPABASE_URL = 'https://wvrqmwsnuzugasaofvmc.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2cnFtd3NudXp1Z2FzYW9mdm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NDQyOTAsImV4cCI6MjA4NzQyMDI5MH0.JzxklIsG-kW6yP_89ZLrFZ1Q7Es2r01m05Ie9K_0Ie0';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    let currentDate = new Date();
    let isMobile = window.innerWidth <= 768;
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
    const themeToggleBtn = document.getElementById('theme-toggle');

    // Theme setup
    let currentTheme = localStorage.getItem('aquapp_theme') || 'light';
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggleBtn) themeToggleBtn.innerHTML = '<i data-lucide="sun"></i>';
    }

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
    async function init() {
        setupMobileSidebar();
        setupEventListeners();
        if (window.lucide) lucide.createIcons();
        
        // Show loading state here if desired

        // Load data from Supabase
        await loadFromSupabase();

        renderCalendar();
        renderSidebarClients();

        // Handle window resize
        window.addEventListener('resize', () => {
            const wasMobile = isMobile;
            isMobile = window.innerWidth <= 768;
            if (wasMobile !== isMobile) {
                renderCalendar();
            }
        });
    }

    function setupMobileSidebar() {
        const fab = document.getElementById('mobile-sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        const overlay = document.createElement('div');
        overlay.classList.add('sidebar-overlay');
        document.body.appendChild(overlay);

        if (fab && sidebar) {
            fab.addEventListener('click', () => {
                sidebar.classList.add('open');
                overlay.classList.add('active');
            });

            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        }
    }

    // --- Calendar Logic ---
    function renderCalendar() {
        calendarDays.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

        let daysToRender = [];

        if (isMobile) {
            // --- WEEKLY VIEW ---
            const current = new Date(currentDate);
            const dayOfWeek = current.getDay();
            const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
            const monday = new Date(current.setDate(diff));

            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                daysToRender.push({
                    date: d,
                    dayNumber: d.getDate(),
                    month: d.getMonth(),
                    year: d.getFullYear(),
                    isOtherMonth: false
                });
            }

            const endSunday = daysToRender[6].date;
            monthYearText.innerText = `${monday.getDate()} ${monthNames[monday.getMonth()].substring(0,3)} - ${endSunday.getDate()} ${monthNames[endSunday.getMonth()].substring(0,3)}`;
        } else {
            // --- MONTHLY VIEW ---
            monthYearText.innerText = `${monthNames[month]} ${year}`;

            let firstDayOfMonth = new Date(year, month, 1).getDay();
            firstDayOfMonth = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const prevMonthDays = new Date(year, month, 0).getDate();

            const totalCells = (firstDayOfMonth + daysInMonth) > 35 ? 42 : 35;

            for (let i = 0; i < totalCells; i++) {
                if (i < firstDayOfMonth) {
                    daysToRender.push({
                        date: new Date(year, month - 1, prevMonthDays - firstDayOfMonth + i + 1),
                        dayNumber: prevMonthDays - firstDayOfMonth + i + 1,
                        month: month - 1,
                        year: year,
                        isOtherMonth: true
                    });
                } else if (i < firstDayOfMonth + daysInMonth) {
                    daysToRender.push({
                        date: new Date(year, month, i - firstDayOfMonth + 1),
                        dayNumber: i - firstDayOfMonth + 1,
                        month: month,
                        year: year,
                        isOtherMonth: false
                    });
                } else {
                    daysToRender.push({
                        date: new Date(year, month + 1, i - (firstDayOfMonth + daysInMonth) + 1),
                        dayNumber: i - (firstDayOfMonth + daysInMonth) + 1,
                        month: month + 1,
                        year: year,
                        isOtherMonth: true
                    });
                }
            }
        }

        // Render the cells
        daysToRender.forEach((dayData) => {
            const dayCell = document.createElement('div');
            dayCell.classList.add('day-cell');
            
            const cellDate = dayData.date;
            const jsDayOfWeek = cellDate.getDay();
            const uiWeekday = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1; 
            dayCell.dataset.weekday = uiWeekday;

            if (dayData.isOtherMonth) {
                dayCell.classList.add('other-month');
            }

            const today = new Date();
            if (dayData.dayNumber === today.getDate() && dayData.month === today.getMonth() && dayData.year === today.getFullYear()) {
                dayCell.classList.add('today');
            }

            if (jsDayOfWeek === 0 || jsDayOfWeek === 6) {
                dayCell.classList.add('weekend');
            }

            const dateStr = formatDate(cellDate);
            dayCell.dataset.date = dateStr;

            if (isMobile) {
                dayCell.innerHTML = `
                    <div class="day-number-header">
                        <span class="day-name">${dayNames[jsDayOfWeek]}</span>
                        <span class="day-number">${dayData.dayNumber} ${monthNames[dayData.month].substring(0,3).toLowerCase()}</span>
                    </div>
                `;
            } else {
                dayCell.innerHTML = `<span class="day-number">${dayData.dayNumber}</span>`;
            }

            const entries = calendarEntries[dateStr] || [];
            entries.forEach(entry => {
                const pill = createClientPill(entry.name, entry.status, true, entry.id);
                dayCell.appendChild(pill);
            });

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
                const dragData = e.dataTransfer.getData('text/plain');
                if (dragData) {
                   const clientData = JSON.parse(dragData);
                   handleDrop(dateStr, clientData);
                }
            });

            calendarDays.appendChild(dayCell);
        });

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
            // Sidebar pills have an explicit remove icon instead of long-press (for tablets)
            const removeIcon = document.createElement('div');
            removeIcon.classList.add('pill-remove');
            removeIcon.innerHTML = '✕';
            removeIcon.title = "Eliminar de la lista";
            removeIcon.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`¿Eliminar a "${name}" de la lista total de clientes?`)) {
                    clients = clients.filter(c => c !== name);
                    delegatedClients = delegatedClients.filter(c => c !== name);
                    saveState();
                    renderSidebarClients();
                }
            };
            pill.appendChild(removeIcon);
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

    async function saveState() {
        // Save locally for offline robustness
        localStorage.setItem('aquapp_clients', JSON.stringify(clients));
        localStorage.setItem('aquapp_entries', JSON.stringify(calendarEntries));
        localStorage.setItem('aquapp_delegated', JSON.stringify(delegatedClients));

        // Sync to Supabase Planner State
        try {
            await supabase.from('planner_state').upsert({
                id: 1,
                entries: calendarEntries,
                delegated: delegatedClients,
                updated_at: new Date()
            });
            // Visual indicator
            saveIndicator.classList.add('visible');
            setTimeout(() => saveIndicator.classList.remove('visible'), 2000);
        } catch (error) {
            console.error('Error saving to Supabase:', error);
            // Could add an "Offline" visual indicator here
        }
    }

    async function loadFromSupabase() {
        try {
            // 1. Fetch Clients (Source of Truth)
            const { data: dbClients, error: clientsError } = await supabase.from('clientes').select('nombre');
            if (dbClients && !clientsError) {
                // Merge local new clients with cloud clients just in case, or override
                clients = dbClients.map(c => c.nombre);
                localStorage.setItem('aquapp_clients', JSON.stringify(clients));
            }

            // 2. Fetch Planner State
            const { data: dbState, error: stateError } = await supabase.from('planner_state').select('entries, delegated').eq('id', 1).single();
            if (dbState && !stateError) {
                calendarEntries = dbState.entries || {};
                delegatedClients = dbState.delegated || [];
                localStorage.setItem('aquapp_entries', JSON.stringify(calendarEntries));
                localStorage.setItem('aquapp_delegated', JSON.stringify(delegatedClients));
            }
        } catch (error) {
            console.error('Error loading from Supabase, using local state:', error);
            // State is already loaded from localStorage at file start
        }
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
            if (isMobile) {
                currentDate.setDate(currentDate.getDate() - 7);
            } else {
                currentDate.setMonth(currentDate.getMonth() - 1);
            }
            renderCalendar();
            renderSidebarClients(); // Re-filter sidebar for new period
        };

        nextMonthBtn.onclick = () => {
            if (isMobile) {
                currentDate.setDate(currentDate.getDate() + 7);
            } else {
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
            renderCalendar();
            renderSidebarClients(); // Re-filter sidebar for new period
        };

        if (themeToggleBtn) {
            themeToggleBtn.onclick = () => {
                currentTheme = currentTheme === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', currentTheme);
                localStorage.setItem('aquapp_theme', currentTheme);
                themeToggleBtn.innerHTML = currentTheme === 'light' ? '<i data-lucide="moon"></i>' : '<i data-lucide="sun"></i>';
                if (window.lucide) lucide.createIcons();
            };
        }

        addClientBtn.onclick = async () => {
            const name = newClientInput.value.trim();
            if (name && !clients.includes(name)) {
                clients.push(name);
                newClientInput.value = '';
                
                // Real-time insert to Supabase Clientes table
                saveIndicator.innerHTML = '<i class="lucide-refresh-cw"></i> Guardando...';
                saveIndicator.classList.add('visible');
                const { error } = await supabase.from('clientes').insert([{ nombre: name }]);
                if (error && error.code !== '23505') { // Ignore unique constraint error
                     console.error("Error adding client to DB:", error);
                }
                saveIndicator.innerHTML = '<i data-lucide="check-circle"></i> Guardado';

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

        confirmImportBtn.onclick = async () => {
            const text = importTextarea.value;
            const newNames = text.split('\n')
                .map(n => n.trim())
                .filter(n => n !== '' && !clients.includes(n));

            if (newNames.length > 0) {
                clients = [...clients, ...newNames];
                
                // Bulk insert to Supabase
                const newRows = newNames.map(name => ({ nombre: name }));
                await supabase.from('clientes').upsert(newRows, { onConflict: 'nombre' });

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

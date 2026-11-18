// ========== دوال السجل والإعدادات الجديدة ==========

let orgSettings = JSON.parse(localStorage.getItem('orgSettings') || '{}');

function loadSettings() {
    const org = JSON.parse(localStorage.getItem('orgSettings') || '{}');
    document.getElementById('orgName').value = org.name || '';
    document.getElementById('taxNumber').value = org.taxNumber || '';
    document.getElementById('orgAddress').value = org.address || '';
    
    const printSettings = JSON.parse(localStorage.getItem('printSettings') || '{}');
    document.getElementById('showLogo').checked = printSettings.showLogo !== false;
    document.getElementById('showSignature').checked = printSettings.showSignature !== false;
    document.getElementById('includeNotes').checked = printSettings.includeNotes || false;
}

function saveOrgSettings() {
    const settings = {
        name: document.getElementById('orgName').value,
        taxNumber: document.getElementById('taxNumber').value,
        address: document.getElementById('orgAddress').value
    };
    localStorage.setItem('orgSettings', JSON.stringify(settings));
    
    const printSettings = {
        showLogo: document.getElementById('showLogo').checked,
        showSignature: document.getElementById('showSignature').checked,
        includeNotes: document.getElementById('includeNotes').checked
    };
    localStorage.setItem('printSettings', JSON.stringify(printSettings));
    
    alert('✅ تم حفظ الإعدادات بنجاح');
}

function loadRecords() {
    const records = getAllRecords();
    const container = document.getElementById('recordsList');
    
    if (records.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>لا يوجد إشعارات مسجلة حتى الآن</p></div>';
        return;
    }
    
    container.innerHTML = records.map((rec, idx) => `
        <div class="record-card">
            <div class="record-header">
                <span class="record-title">${rec.receiverName || 'غير مسمى'}</span>
                <span class="record-date">${rec.date} - ${rec.time}</span>
            </div>
            <div class="record-body">
                <p><strong>المبلغ:</strong> ${rec.amount || '0'} ل.س</p>
                <p><strong>المرجع:</strong> ${rec.referenceNumber || '-'}</p>
                <p><strong>الحساب:</strong> ${rec.receiverAccount || '-'}</p>
            </div>
            <div class="record-actions">
                <button onclick="viewRecord(${idx})" class="btn btn-sm">👁️ عرض</button>
                <button onclick="downloadRecordPDF(${idx})" class="btn btn-sm">📄 PDF</button>
                ${currentUser.role === 'admin' || currentUser.role === 'coordinator' 
                    ? `<button onclick="deleteRecord(${idx})" class="btn btn-sm btn-danger">🗑️ حذف</button>` 
                    : ''}
            </div>
        </div>
    `).join('');
}

function searchRecords() {
    const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
    const records = getAllRecords();
    const filtered = records.filter(rec => 
        (rec.receiverName || '').toLowerCase().includes(keyword) ||
        (rec.referenceNumber || '').toLowerCase().includes(keyword)
    );
    renderFilteredRecords(filtered);
}

function filterRecords() {
    const filter = document.getElementById('filterDate').value;
    let records = getAllRecords();
    const today = new Date().toLocaleDateString('en-CA');
    
    if (filter === 'today') {
        records = records.filter(r => r.date === today);
    } else if (filter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        records = records.filter(r => new Date(r.date) >= weekAgo);
    } else if (filter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        records = records.filter(r => new Date(r.date) >= monthAgo);
    }
    renderFilteredRecords(records);
}

function renderFilteredRecords(records) {
    const container = document.getElementById('recordsList');
    if (records.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>لا توجد نتائج مطابقة</p></div>';
        return;
    }
    container.innerHTML = records.map((rec, idx) => `
        <div class="record-card">
            <div class="record-header">
                <span class="record-title">${rec.receiverName || 'غير مسمى'}</span>
                <span class="record-date">${rec.date} - ${rec.time}</span>
            </div>
            <div class="record-body">
                <p><strong>المبلغ:</strong> ${rec.amount || '0'} ل.س</p>
                <p><strong>المرجع:</strong> ${rec.referenceNumber || '-'}</p>
            </div>
        </div>
    `).join('');
}

function deleteRecord(index) {
    if (!confirm('هل أنت متأكد من حذف هذا الإشعار؟')) return;
    let records = getAllRecords();
    records.splice(index, 1);
    localStorage.setItem('transferRecords', JSON.stringify(records));
    loadRecords();
}

function clearAllConfirm() {
    if (!confirm('⚠️ هل تريد مسح جميع السجلات؟ لا يمكن التراجع عن هذا الإجراء!')) return;
    localStorage.removeItem('transferRecords');
    loadRecords();
}

function exportAllData() {
    const records = getAllRecords();
    const blob = new Blob([JSON.stringify(records, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shamcash-backup-${new Date().toLocaleDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData() {
    document.getElementById('importFile').click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error('الملف غير صالح');
            if (confirm(`تم العثور على ${data.length} سجل. هل تدمجها مع البيانات الحالية؟`)) {
                let existing = getAllRecords();
                existing = [...data, ...existing];
                localStorage.setItem('transferRecords', JSON.stringify(existing));
                alert('✅ تم استيراد البيانات بنجاح');
                loadRecords();
            }
        } catch(err) {
            alert('❌ خطأ في قراءة الملف: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function exportExcel() {
    const records = getAllRecords();
    let csv = 'اسم المستلم,الحساب,المرجع,المبلغ,التاريخ,الوقت\n';
    records.forEach(r => {
        csv += `"${r.receiverName || ''}","${r.receiverAccount || ''}","${r.referenceNumber || ''}","${r.amount || ''}","${r.date || ''}","${r.time || ''}"\n`;
    });
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `سجل-الاشعارات-${new Date().toLocaleDateString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
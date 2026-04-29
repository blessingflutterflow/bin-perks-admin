// CSV Export Utility

export function downloadCSV(data: any[], filename: string) {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that need quotes (commas, newlines, quotes)
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Format business data for export
export function formatBusinessesForExport(businesses: any[]) {
  return businesses.map(b => ({
    'Business Name': b.name || '',
    'Category': b.category || '',
    'Description': b.description || '',
    'Address': b.address || '',
    'Phone': b.phone || '',
    'Total Stamps': b.totalStamps || 0,
    'Created Date': b.createdAt?.toDate?.().toLocaleDateString() || '',
  }));
}

// Format user data for export
export function formatUsersForExport(users: any[]) {
  return users.map(u => ({
    'Email': u.email || '',
    'Display Name': u.displayName || '',
    'Role': u.role || 'customer',
    'Created Date': u.createdAt?.toDate?.().toLocaleDateString() || '',
  }));
}

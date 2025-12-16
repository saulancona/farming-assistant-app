import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Expense, Income, Field } from '../types';
import { format } from 'date-fns';

interface ReportData {
  expenses: Expense[];
  income: Income[];
  fields: Field[];
  dateRange: string;
  metrics: {
    totalExpenses: number;
    totalIncome: number;
    netProfit: number;
    profitMargin: number;
  };
}

// Export to CSV
export function exportToCSV(data: ReportData) {
  const { expenses, income, dateRange, metrics } = data;
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');

  // Create summary section
  let csvContent = `AgroAfrica Farm Management Report\n`;
  csvContent += `Generated: ${format(new Date(), 'PPpp')}\n`;
  csvContent += `Period: ${dateRange}\n\n`;

  csvContent += `Financial Summary\n`;
  csvContent += `Total Income,$${metrics.totalIncome.toLocaleString()}\n`;
  csvContent += `Total Expenses,$${metrics.totalExpenses.toLocaleString()}\n`;
  csvContent += `Net Profit,$${metrics.netProfit.toLocaleString()}\n`;
  csvContent += `Profit Margin,${metrics.profitMargin.toFixed(2)}%\n\n`;

  // Expenses section
  csvContent += `\nExpenses\n`;
  csvContent += `Date,Category,Description,Amount,Field\n`;
  expenses.forEach(expense => {
    csvContent += `${expense.date},${expense.category},${expense.description},${expense.amount},${expense.fieldName || 'N/A'}\n`;
  });

  // Income section
  csvContent += `\n\nIncome\n`;
  csvContent += `Date,Source,Description,Amount,Field\n`;
  income.forEach(inc => {
    csvContent += `${inc.date},${inc.source},${inc.description},${inc.amount},${inc.fieldName || 'N/A'}\n`;
  });

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `AgroAfrica_Report_${timestamp}.csv`;
  link.click();
}

// Export to PDF
export function exportToPDF(data: ReportData) {
  const { expenses, income, dateRange, metrics } = data;
  const doc = new jsPDF();
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');

  // Title
  doc.setFontSize(20);
  doc.setTextColor(22, 163, 74); // Green color
  doc.text('AgroAfrica Farm Management', 105, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Financial Report', 105, 30, { align: 'center' });

  // Report info
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 40);
  doc.text(`Period: ${dateRange}`, 14, 45);

  // Financial Summary Section
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Financial Summary', 14, 55);

  const summaryData = [
    ['Total Income', `$${metrics.totalIncome.toLocaleString()}`],
    ['Total Expenses', `$${metrics.totalExpenses.toLocaleString()}`],
    ['Net Profit', `$${metrics.netProfit.toLocaleString()}`],
    ['Profit Margin', `${metrics.profitMargin.toFixed(2)}%`]
  ];

  autoTable(doc, {
    startY: 60,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74] },
    margin: { left: 14 },
  });

  // Expenses Section
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  doc.setFontSize(14);
  doc.text('Expenses', 14, finalY + 10);

  const expenseData = expenses.map(exp => [
    exp.date,
    exp.category,
    exp.description,
    `$${exp.amount.toLocaleString()}`,
    exp.fieldName || 'N/A'
  ]);

  autoTable(doc, {
    startY: finalY + 15,
    head: [['Date', 'Category', 'Description', 'Amount', 'Field']],
    body: expenseData,
    theme: 'striped',
    headStyles: { fillColor: [22, 163, 74] },
    margin: { left: 14 },
    styles: { fontSize: 8 },
  });

  // Income Section (new page if needed)
  const expenseFinalY = (doc as any).lastAutoTable.finalY || 150;

  if (expenseFinalY > 250) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Income', 14, 20);

    const incomeData = income.map(inc => [
      inc.date,
      inc.source,
      inc.description,
      `$${inc.amount.toLocaleString()}`,
      inc.fieldName || 'N/A'
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['Date', 'Source', 'Description', 'Amount', 'Field']],
      body: incomeData,
      theme: 'striped',
      headStyles: { fillColor: [22, 163, 74] },
      margin: { left: 14 },
      styles: { fontSize: 8 },
    });
  } else {
    doc.setFontSize(14);
    doc.text('Income', 14, expenseFinalY + 10);

    const incomeData = income.map(inc => [
      inc.date,
      inc.source,
      inc.description,
      `$${inc.amount.toLocaleString()}`,
      inc.fieldName || 'N/A'
    ]);

    autoTable(doc, {
      startY: expenseFinalY + 15,
      head: [['Date', 'Source', 'Description', 'Amount', 'Field']],
      body: incomeData,
      theme: 'striped',
      headStyles: { fillColor: [22, 163, 74] },
      margin: { left: 14 },
      styles: { fontSize: 8 },
    });
  }

  // Save the PDF
  doc.save(`AgroAfrica_Report_${timestamp}.pdf`);
}

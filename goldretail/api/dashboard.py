import frappe
from frappe.utils import nowdate, get_datetime

@frappe.whitelist()
def get_revenue_updates(year=None, month=None):
    if not year:
        year = get_datetime(nowdate()).year
    if not month:
        month = get_datetime(nowdate()).month
        
    year = int(year)
    month = int(month)
    
    # 1. Sales (Income)
    sales_data = frappe.db.sql("""
        SELECT 
            DAY(posting_date) as day, 
            SUM(grand_total) as grand_total, 
            SUM(outstanding_amount) as outstanding
        FROM `tabSales Invoice`
        WHERE docstatus = 1 AND YEAR(posting_date) = %s AND MONTH(posting_date) = %s
        GROUP BY DAY(posting_date)
    """, (year, month), as_dict=True)

    # 2. Purchases (Expense)
    purchase_data = frappe.db.sql("""
        SELECT 
            DAY(posting_date) as day, 
            SUM(grand_total) as grand_total, 
            SUM(outstanding_amount) as outstanding
        FROM `tabPurchase Invoice`
        WHERE docstatus = 1 AND YEAR(posting_date) = %s AND MONTH(posting_date) = %s
        GROUP BY DAY(posting_date)
    """, (year, month), as_dict=True)

    total_income = 0
    pending_income = 0
    total_expense = 0
    pending_expense = 0

    # 6 bins representing 5-day intervals: 1-5, 6-10, 11-15, 16-20, 21-25, 26+
    income_paid_series = [0] * 6
    income_pending_series = [0] * 6
    expense_paid_series = [0] * 6
    expense_pending_series = [0] * 6

    def get_bin(day):
        if day <= 5: return 0
        if day <= 10: return 1
        if day <= 15: return 2
        if day <= 20: return 3
        if day <= 25: return 4
        return 5

    for row in sales_data:
        d = int(row.day)
        gt = float(row.grand_total or 0)
        out = float(row.outstanding or 0)
        paid = gt - out
        
        income_paid_series[get_bin(d)] += paid
        income_pending_series[get_bin(d)] += out
        total_income += gt
        pending_income += out

    for row in purchase_data:
        d = int(row.day)
        gt = float(row.grand_total or 0)
        out = float(row.outstanding or 0)
        paid = gt - out
        
        expense_paid_series[get_bin(d)] += paid
        expense_pending_series[get_bin(d)] += out
        total_expense += gt
        pending_expense += out

    return {
        "total_income": total_income,
        "pending_income": pending_income,
        "total_expense": total_expense,
        "pending_expense": pending_expense,
        "chart_data": {
            "income_paid": income_paid_series,
            "income_pending": income_pending_series,
            "expense_paid": expense_paid_series,
            "expense_pending": expense_pending_series
        },
        "year": year,
        "month": month
    }

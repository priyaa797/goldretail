import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Button, Typography, Grid, MenuItem, IconButton, Table, TableContainer, TableBody, TableCell, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, createFilterOptions, CircularProgress, Alert, Chip, FormControlLabel } from '@mui/material';
import BlankCard from '../../components/shared/BlankCard';
import ExpandableItemName from '../../components/shared/ExpandableItemName';

import CustomTextField from '../../components/forms/theme-elements/CustomTextField';
import CustomCheckbox from '../../components/forms/theme-elements/CustomCheckbox';

import { useFrappePostCall, useFrappeGetDocList, useFrappeGetCall, useFrappeGetDoc } from 'frappe-react-sdk';
import { useNavigate, useParams } from 'react-router';
import { IconTrash, IconDeviceFloppy, IconCamera, IconArrowLeft, IconWifiOff, IconRestore, IconCheck } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const filterOptions = createFilterOptions({
  stringify: (option) => `${option.item_code} ${option.item_name || ''}`,
});

const DRAFT_KEY_PREFIX = 'goldretail_draft_sales_invoice_';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default function SalesForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const draftStorageKey = isEditMode ? `${DRAFT_KEY_PREFIX}${id}` : `${DRAFT_KEY_PREFIX}new`;

  const [customer, setCustomer] = useState('');
  const [dueDate, setDueDate] = useState(() => dayjs().add(1, 'month').format('YYYY-MM-DD'));
  const [priceList, setPriceList] = useState('Wholesale');
  const [gstApplicable, setGstApplicable] = useState(false);
  const [items, setItems] = useState([{ item_code: '', item_name: '', warehouse: '', qty: '', rate: 0, user_rate: '', carton: '', packing: '', total_weight: '', discount: '' }]);
  const [transportationCharges, setTransportationCharges] = useState('');
  const [packagingCharges, setPackagingCharges] = useState('');
  const [transporter, setTransporter] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [docLoaded, setDocLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialSnapshot = useRef(null);
  const [openRowIndex, setOpenRowIndex] = useState(null);
  const focusRowIndexRef = useRef(null);

  // Autosave and network states
  const [savedDraft, setSavedDraft] = useState(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftInitialized, setDraftInitialized] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const { data: existingDoc, isLoading: isLoadingDoc, error: docError } = useFrappeGetDoc('Sales Invoice', isEditMode ? id : null);

  const { data: customers } = useFrappeGetDocList('Customer', { fields: ['name', 'customer_group', 'default_price_list'], limit: 10000 });
  const { data: customerGroups } = useFrappeGetDocList('Customer Group', { fields: ['name', 'default_price_list'], limit: 1000 });
  const { data: rawTransporters } = useFrappeGetDocList('Supplier', {
    fields: ['name', 'supplier_name', 'is_transporter'],
    filters: [['is_transporter', '=', 1]],
    limit: 1000
  });

  const transporters = useMemo(() => {
    if (!rawTransporters) return [];
    return rawTransporters.filter(t => t.is_transporter === 1 || t.is_transporter === true);
  }, [rawTransporters]);

  const { data: rawWarehouses } = useFrappeGetDocList('Warehouse', {
    fields: ['name', 'warehouse_name', 'is_group', 'disabled'],
    filters: [
      ['is_group', '=', 0],
      ['disabled', '=', 0]
    ],
    orderBy: { field: 'name', order: 'asc' },
    limit: 1000
  });

  const warehouses = useMemo(() => {
    if (!rawWarehouses) return [];
    return rawWarehouses.filter(w => !w.is_group && !w.disabled);
  }, [rawWarehouses]);

  const defaultWarehouse = warehouses[0]?.name || `NEW - ${import.meta.env.VITE_COMPANY_ABBR || 'PC'}`;

  const { data: bins } = useFrappeGetDocList('Bin', {
    fields: ['item_code', 'warehouse', 'actual_qty'],
    limit: 100000
  });

  const binMap = useMemo(() => {
    const map = {};
    if (bins && bins.length) {
      for (const b of bins) {
        map[`${b.item_code}:::${b.warehouse}`] = Number(b.actual_qty) || 0;
      }
    }
    return map;
  }, [bins]);

  // Set default warehouse on initial item if empty once defaultWarehouse resolves
  useEffect(() => {
    if (defaultWarehouse) {
      setItems(prev => {
        if (prev.length === 1 && !prev[0].item_code && !prev[0].warehouse) {
          return [{ ...prev[0], warehouse: defaultWarehouse }];
        }
        return prev;
      });
    }
  }, [defaultWarehouse]);

  const { data: itemListResponse } = useFrappeGetCall('goldretail.api.item_barcode.get_all_items');
  const rawItemList = itemListResponse?.message || [];
  const itemList = useMemo(() => {
    return rawItemList.filter(i => !i.disabled || Number(i.disabled) === 0);
  }, [rawItemList]);

  const { data: itemPrices } = useFrappeGetDocList('Item Price', {
    fields: ['item_code', 'price_list_rate'],
    filters: [['price_list', '=', priceList]],
    limit: 100000
  });

  const getPrice = (itemCode) => {
    const priceDoc = itemPrices?.find(p => p.item_code === itemCode);
    return priceDoc ? priceDoc.price_list_rate : 0;
  };

  useEffect(() => {
    if (isEditMode && existingDoc && !docLoaded) {
      const initialCust = existingDoc.customer || '';
      const initialDueDate = existingDoc.due_date || (existingDoc.posting_date ? dayjs(existingDoc.posting_date).add(1, 'month').format('YYYY-MM-DD') : dayjs().add(1, 'month').format('YYYY-MM-DD'));
      const initialPl = existingDoc.selling_price_list || 'Wholesale';
      setCustomer(initialCust);
      setDueDate(initialDueDate);
      setPriceList(initialPl);

      const initialTransporter = existingDoc.transporter || '';
      const initialDriver = existingDoc.driver_name || '';
      const initialVehicle = existingDoc.vehicle_no || '';
      setTransporter(initialTransporter);
      setDriverName(initialDriver);
      setVehicleNo(initialVehicle);

      // Populate transportation and packaging charges
      const transportCharge = existingDoc.taxes?.find(t =>
        t.charge_type === 'Actual' &&
        (t.account_head?.includes('Transportation') || t.description?.toLowerCase().includes('transport'))
      );
      const initialTransport = transportCharge ? String(transportCharge.tax_amount || '') : '';
      if (initialTransport) {
        setTransportationCharges(initialTransport);
      }

      const packagingCharge = existingDoc.taxes?.find(t =>
        t.charge_type === 'Actual' &&
        (t.account_head?.includes('Packaging') || t.description?.toLowerCase().includes('packag'))
      );
      const initialPackaging = packagingCharge ? String(packagingCharge.tax_amount || '') : '';
      if (initialPackaging) {
        setPackagingCharges(initialPackaging);
      }

      // Check if GST is applicable on existing doc
      const hasGst = Boolean(
        existingDoc.taxes_and_charges ||
        existingDoc.taxes?.some(t =>
          t.account_head?.includes('CGST') ||
          t.account_head?.includes('SGST') ||
          t.account_head?.includes('IGST') ||
          (t.charge_type === 'On Net Total' && !t.account_head?.includes('Transportation') && !t.account_head?.includes('Packaging'))
        )
      );
      setGstApplicable(hasGst);

      // Populate items
      let loadedItems = [];
      if (existingDoc.items && existingDoc.items.length > 0) {
        loadedItems = existingDoc.items.map(item => {
          const fullItem = itemList?.find(i => i.item_code === item.item_code);
          const baseRate = Number(item.price_list_rate) || Number(item.rate) || 0;
          const sysPrice = getPrice(item.item_code) || fullItem?.standard_rate || 0;
          const userRateVal = (sysPrice > 0 && Math.abs(baseRate - sysPrice) < 0.001) ? '' : String(baseRate);
          const gst_percentage = (Number(item.cgst_rate) || 0) + (Number(item.sgst_rate) || 0) + (Number(item.igst_rate) || 0) || fullItem?.gst_percentage || 0;

          return {
            item_code: item.item_code,
            item_name: item.item_name || fullItem?.item_name || '',
            warehouse: item.warehouse || defaultWarehouse || '',
            qty: item.qty ? String(item.qty) : '',
            rate: sysPrice || baseRate,
            user_rate: userRateVal,
            carton: item.carton ? String(item.carton) : '',
            packing: item.packing ? String(item.packing) : (fullItem?.packing_from_item || ''),
            total_weight: item.total_weight ? String(item.total_weight) : (item.carton_weight ? String(item.carton_weight) : ''),
            weight_per_unit: item.weight_per_unit || fullItem?.weight_per_unit || 0,
            discount: item.discount_percentage ? String(item.discount_percentage) : '',
            gst_percentage: gst_percentage
          };
        });
        setItems(loadedItems);
      }

      initialSnapshot.current = {
        customer: initialCust,
        dueDate: initialDueDate,
        priceList: initialPl,
        gstApplicable: hasGst,
        transporter: (initialTransporter || '').trim(),
        driverName: (initialDriver || '').trim(),
        vehicleNo: (initialVehicle || '').trim(),
        transportationCharges: Number(initialTransport) || 0,
        packagingCharges: Number(initialPackaging) || 0,
        items: loadedItems.map(i => ({
          item_code: i.item_code,
          warehouse: (i.warehouse || '').trim(),
          qty: Number(i.qty) || 0,
          rate: Number(i.user_rate) || Number(i.rate) || 0,
          discount: Number(i.discount) || 0,
          carton: Number(i.carton) || 0,
          packing: Number(i.packing) || 0,
          total_weight: Number(i.total_weight) || 0
        }))
      };

      setDocLoaded(true);
    }
  }, [isEditMode, existingDoc, docLoaded, itemList, itemPrices]);

  const hasChanges = () => {
    if (!initialSnapshot.current) return false;

    if ((customer || '').trim() !== (initialSnapshot.current.customer || '').trim()) return true;
    if ((dueDate || '') !== (initialSnapshot.current.dueDate || '')) return true;
    if ((priceList || 'Wholesale') !== (initialSnapshot.current.priceList || 'Wholesale')) return true;
    if (gstApplicable !== Boolean(initialSnapshot.current.gstApplicable)) return true;
    if ((transporter || '').trim() !== (initialSnapshot.current.transporter || '').trim()) return true;
    if ((driverName || '').trim() !== (initialSnapshot.current.driverName || '').trim()) return true;
    if ((vehicleNo || '').trim() !== (initialSnapshot.current.vehicleNo || '').trim()) return true;
    if ((Number(transportationCharges) || 0) !== initialSnapshot.current.transportationCharges) return true;
    if ((Number(packagingCharges) || 0) !== initialSnapshot.current.packagingCharges) return true;

    const validCurrentItems = items.filter(i => i.item_code);
    if (validCurrentItems.length !== initialSnapshot.current.items.length) return true;

    for (let idx = 0; idx < validCurrentItems.length; idx++) {
      const cur = validCurrentItems[idx];
      const orig = initialSnapshot.current.items[idx];
      if (cur.item_code !== orig.item_code) return true;
      if ((Number(cur.qty) || 0) !== orig.qty) return true;
      const curRate = Number(cur.user_rate) || Number(cur.rate) || 0;
      if (Math.abs(curRate - orig.rate) > 0.001) return true;
      if ((Number(cur.discount) || 0) !== orig.discount) return true;
      if ((Number(cur.carton) || 0) !== orig.carton) return true;
      if ((Number(cur.packing) || 0) !== orig.packing) return true;
      const curWeight = Number(cur.total_weight) || 0;
      if (Math.abs(curWeight - orig.total_weight) > 0.001) return true;
      if ((cur.warehouse || '').trim() !== (orig.warehouse || '').trim()) return true;
    }

    return false;
  };

  useEffect(() => {
    if (!itemPrices) return;
    setItems(prevItems => {
      let needsUpdate = false;
      const newItems = prevItems.map(item => {
        if (!item.item_code) return item;
        const priceDoc = itemPrices.find(p => p.item_code === item.item_code);
        const newRate = priceDoc ? priceDoc.price_list_rate : item.rate;
        if (newRate !== item.rate) {
          needsUpdate = true;
          return { ...item, rate: newRate };
        }
        return item;
      });
      return needsUpdate ? newItems : prevItems;
    });
  }, [itemPrices]);

  // Cleanup drafts older than 3 days
  const cleanExpiredDrafts = () => {
    try {
      const now = Date.now();
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DRAFT_KEY_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.timestamp && (now - parsed.timestamp > THREE_DAYS_MS)) {
              keysToRemove.push(key);
            }
          }
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error('Error cleaning expired drafts', e);
    }
  };

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Internet connection restored');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Internet connection lost. Changes are being saved locally.', { duration: 4000 });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for unsaved draft on mount or when storage key changes
  useEffect(() => {
    cleanExpiredDrafts();
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const isNotExpired = parsed.timestamp && (Date.now() - parsed.timestamp <= THREE_DAYS_MS);
        const hasData = Boolean(
          parsed.customer ||
          (parsed.items && parsed.items.some(i => i.item_code)) ||
          parsed.transporter ||
          parsed.driverName ||
          parsed.vehicleNo
        );
        if (isNotExpired && hasData) {
          setSavedDraft(parsed);
          setShowDraftBanner(true);
        } else if (!isNotExpired) {
          localStorage.removeItem(draftStorageKey);
        }
      }
    } catch (e) {
      console.error('Failed to load draft from localStorage', e);
    } finally {
      if (!isEditMode) {
        setDraftInitialized(true);
      }
    }
  }, [draftStorageKey, isEditMode]);

  useEffect(() => {
    if (isEditMode && docLoaded) {
      setDraftInitialized(true);
    }
  }, [isEditMode, docLoaded]);

  // Restore draft handler
  const handleRestoreDraft = () => {
    if (!savedDraft) return;
    if (savedDraft.customer !== undefined) setCustomer(savedDraft.customer);
    if (savedDraft.dueDate !== undefined) setDueDate(savedDraft.dueDate);
    if (savedDraft.priceList !== undefined) setPriceList(savedDraft.priceList);
    if (savedDraft.gstApplicable !== undefined) setGstApplicable(savedDraft.gstApplicable);
    if (savedDraft.transporter !== undefined) setTransporter(savedDraft.transporter);
    if (savedDraft.driverName !== undefined) setDriverName(savedDraft.driverName);
    if (savedDraft.vehicleNo !== undefined) setVehicleNo(savedDraft.vehicleNo);
    if (savedDraft.transportationCharges !== undefined) setTransportationCharges(savedDraft.transportationCharges);
    if (savedDraft.packagingCharges !== undefined) setPackagingCharges(savedDraft.packagingCharges);
    if (savedDraft.items && savedDraft.items.length > 0) {
      setItems(savedDraft.items);
    }
    setLastSavedAt(savedDraft.timestamp);
    setShowDraftBanner(false);
    toast.success('Draft restored successfully');
  };

  // Discard draft handler
  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftStorageKey);
    } catch (e) {
      console.error(e);
    }
    setSavedDraft(null);
    setShowDraftBanner(false);
    toast('Draft discarded', { icon: '🗑️' });
  };

  // Debounced autosave effect
  useEffect(() => {
    if (!draftInitialized) return;

    const hasData = Boolean(
      customer ||
      (items && items.some(i => i.item_code)) ||
      transporter ||
      driverName ||
      vehicleNo ||
      transportationCharges ||
      packagingCharges
    );

    if (!hasData) return;

    const timer = setTimeout(() => {
      try {
        const draftPayload = {
          timestamp: Date.now(),
          customer,
          dueDate,
          priceList,
          gstApplicable,
          transporter,
          driverName,
          vehicleNo,
          transportationCharges,
          packagingCharges,
          items
        };
        localStorage.setItem(draftStorageKey, JSON.stringify(draftPayload));
        setLastSavedAt(draftPayload.timestamp);
      } catch (e) {
        console.error('Failed to autosave draft', e);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [
    draftInitialized,
    draftStorageKey,
    customer,
    priceList,
    gstApplicable,
    transporter,
    driverName,
    vehicleNo,
    transportationCharges,
    packagingCharges,
    items
  ]);

  const { call: saveSalesInvoice } = useFrappePostCall('goldretail.api.sales.save_sales_invoice');
  const { call: getBarcodeItem } = useFrappePostCall('goldretail.api.item_barcode.get_item_by_barcode');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const processBarcode = async (barcode) => {
    if (!barcode) return;
    try {
      const res = await getBarcodeItem({ barcode_val: barcode });
      const itemData = res.message;
      if (itemData) {
        const existingIndex = items.findIndex(i => i.item_code === itemData.item_code);
        if (existingIndex >= 0) {
          toast.error(`Item ${itemData.item_code} is already added!`);
        } else {
          // find the full item data from our list to populate name and description
          const fullItem = itemList?.find(i => i.item_code === itemData.item_code);

          const newItem = {
            item_code: itemData.item_code,
            item_name: fullItem?.item_name || itemData.item_name || '',
            warehouse: fullItem?.default_warehouse || defaultWarehouse || warehouses[0]?.name || '',
            qty: '',
            rate: getPrice(itemData.item_code) || fullItem?.standard_rate || itemData.standard_rate || 0,
            user_rate: '',
            weight_per_unit: fullItem?.weight_per_unit || itemData.weight_per_unit || 0,
            packing: fullItem?.packing_from_item || itemData.packing_from_item || '',
            carton: '',
            total_weight: ''
          };

          if (items.length === 1 && items[0].item_code === '') {
            setItems([newItem]);
          } else {
            setItems([...items, newItem]);
          }
          toast.success(`Added ${itemData.item_code}`);
        }
      }
    } catch (error) {
      toast.error('Invalid barcode or item not found');
    }
  };

  const handleBarcodeScan = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const barcode = barcodeInput.trim();
      processBarcode(barcode);
      setBarcodeInput('');
    }
  };

  const handleSave = () => {
    // In edit mode, check if any changes were made
    if (isEditMode && !hasChanges()) {
      toast.error('No changes to update.');
      return;
    }

    // Validation
    if (!customer) {
      toast.error('Please select a customer');
      return;
    }
    const invalidItems = items.filter(i => !i.item_code || (Number(i.qty) || 0) <= 0 || (Number(i.user_rate) || Number(i.rate) || 0) <= 0);
    if (invalidItems.length > 0) {
      toast.error('Please ensure all items have an Item Code, valid Quantity, and valid Rate.');
      return;
    }

    const doc = {
      doctype: 'Sales Invoice',
      customer,
      due_date: dueDate || dayjs().add(1, 'month').format('YYYY-MM-DD'),
      selling_price_list: priceList,
      transporter: (transporter || '').trim(),
      driver_name: (driverName || '').trim(),
      vehicle_no: (vehicleNo || '').trim(),
      ...(isEditMode ? (
        existingDoc?.docstatus === 1 ? {
          amended_from: id,
          posting_date: existingDoc?.posting_date,
          posting_time: existingDoc?.posting_time,
          set_posting_time: 1
        } : {
          name: id,
          posting_date: existingDoc?.posting_date,
          posting_time: existingDoc?.posting_time,
          set_posting_time: 1
        }
      ) : {}),
      items: items.map(i => {
        const qty = Number(i.qty) || 0;
        const baseRate = Number(i.user_rate) || Number(i.rate) || 0;
        const discountPercentage = Number(i.discount) || 0;

        return {
          item_code: i.item_code,
          qty: qty,
          price_list_rate: baseRate,
          discount_percentage: discountPercentage,
          carton: Number(i.carton) || 0,
          packing: Number(i.packing) || 0,
          total_weight: Number(i.total_weight) || 0,
          warehouse: i.warehouse || defaultWarehouse || ''
        };
      }),
      taxes_and_charges: gstApplicable
        ? (existingDoc?.taxes_and_charges || `Output GST In-state - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}`)
        : '',
      taxes: [
        ...(gstApplicable ? [
          { charge_type: 'On Net Total', account_head: `Output Tax CGST - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}`, description: `Output Tax CGST - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}` },
          { charge_type: 'On Net Total', account_head: `Output Tax SGST - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}`, description: `Output Tax SGST - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}` }
        ] : []),
        ...(Number(transportationCharges) > 0 ? [{ charge_type: 'Actual', account_head: `Transportation Charges - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}`, description: 'Transportation Charges', tax_amount: Number(transportationCharges) }] : []),
        ...(Number(packagingCharges) > 0 ? [{ charge_type: 'Actual', account_head: `Packaging Charges - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}`, description: 'Packaging Charges', tax_amount: Number(packagingCharges) }] : [])
      ],
      update_stock: 1,
      docstatus: 0
    };

    const executeSave = async () => {
      setIsSubmitting(true);
      try {
        const res = await saveSalesInvoice({ doc });
        return res;
      } finally {
        setIsSubmitting(false);
      }
    };

    toast.promise(
      executeSave(),
      {
        loading: isEditMode ? 'Updating Sales Invoice...' : 'Saving Sales Invoice...',
        success: (res) => {
          try {
            localStorage.removeItem(draftStorageKey);
          } catch (e) {
            console.error(e);
          }
          setSavedDraft(null);
          setShowDraftBanner(false);
          setLastSavedAt(null);
          const newDocName = res.message?.name || res.name || id;
          navigate(`/sales/${encodeURIComponent(newDocName)}`);
          return existingDoc?.docstatus === 1
            ? `Sales ${id} amended to ${newDocName} successfully!`
            : isEditMode
              ? `Sales ${newDocName} updated successfully!`
              : `Sales ${newDocName} saved successfully!`;
        },
        error: (err) => {
          let errorMsg = isEditMode ? 'Error updating sales' : 'Error saving sales';
          if (err._server_messages) {
            try {
              const messages = JSON.parse(err._server_messages);
              const lastMsg = JSON.parse(messages[messages.length - 1]);
              if (lastMsg.message) {
                const doc = new DOMParser().parseFromString(lastMsg.message, 'text/html');
                errorMsg = doc.body.textContent || doc.body.innerText || errorMsg;
              }
            } catch (e) {
              errorMsg = err.message || errorMsg;
            }
          } else if (err.message) {
            errorMsg = err.message;
          }
          return errorMsg;
        }
      }
    );
  };

  const addItem = () => {
    const newIndex = items.length;
    focusRowIndexRef.current = newIndex;
    setOpenRowIndex(newIndex);
    setItems([...items, { item_code: '', item_name: '', warehouse: defaultWarehouse || warehouses[0]?.name || '', qty: '', rate: 0, user_rate: '', carton: '', packing: '', total_weight: '', discount: '' }]);
  };
  const removeItem = (index) => {
    if (openRowIndex === index) {
      setOpenRowIndex(null);
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const stripHtml = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  if (isEditMode && isLoadingDoc) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (isEditMode && (docError || (!existingDoc && !isLoadingDoc))) {
    return (
      <Box p={3}>
        <Button startIcon={<IconArrowLeft size={18} />} onClick={() => navigate('/sales')} sx={{ mb: 2 }}>
          Back to Sales
        </Button>
        <Typography color="error">Error loading invoice details for editing.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<IconArrowLeft size={18} />}
            onClick={() => navigate(isEditMode ? `/sales/${encodeURIComponent(id)}` : '/sales')}
            color="inherit"
          >
            Back
          </Button>
          <Typography variant="h5" fontWeight="bold">
            {isEditMode ? (existingDoc?.docstatus === 1 ? `Update Sale - ${id}` : `Edit Sale - ${id}`) : 'New Sale'}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1.5}>
          {!isOnline && (
            <Chip
              icon={<IconWifiOff size={16} />}
              label="Offline"
              color="error"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
          {lastSavedAt && (
            <Chip
              icon={<IconCheck size={16} />}
              label={`Auto-saved (${dayjs(lastSavedAt).format('hh:mm A')})`}
              variant="outlined"
              size="small"
              color="default"
            />
          )}
          <Button
            variant="contained"
            startIcon={<IconDeviceFloppy size={18} />}
            onClick={handleSave}
            disabled={isSubmitting}
          >
            Save
          </Button>
        </Box>
      </Box>

      {!isOnline && (
        <Alert
          severity="warning"
          icon={<IconWifiOff size={22} />}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2" fontWeight="600">
            You are currently working offline
          </Typography>
          <Typography variant="body2">
            No internet connection detected. Don't worry — all your entered items and details are safely auto-saved on this device. You can continue adding items, and click Save once your connection is restored.
          </Typography>
        </Alert>
      )}

      {showDraftBanner && savedDraft && (
        <Alert
          severity="info"
          icon={<IconRestore size={22} />}
          sx={{ mb: 3 }}
          action={
            <Box display="flex" gap={1} alignItems="center" sx={{ mt: { xs: 1, sm: 0 } }}>
              <Button
                color="primary"
                size="small"
                variant="contained"
                onClick={handleRestoreDraft}
              >
                Restore Draft
              </Button>
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={handleDiscardDraft}
              >
                Discard
              </Button>
            </Box>
          }
        >
          <Typography variant="subtitle2" fontWeight="600">
            Unsaved Draft Found
          </Typography>
          <Typography variant="body2">
            An unsaved draft from {dayjs(savedDraft.timestamp).fromNow()} ({dayjs(savedDraft.timestamp).format('DD MMM, hh:mm A')}) containing {savedDraft.items?.filter(i => i.item_code)?.length || 0} item(s) was found. Would you like to restore it?
          </Typography>
        </Alert>
      )}

      <BlankCard><Box sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={customers || []}
              getOptionLabel={(option) => option.name || ''}
              value={customers?.find(c => c.name === customer) || null}
              onChange={(e, newValue) => {
                const val = newValue ? newValue.name : '';
                setCustomer(val);
                const selectedCust = newValue;
                if (selectedCust) {
                  let pl = selectedCust.default_price_list;
                  if (!pl && selectedCust.customer_group) {
                    const group = customerGroups?.find(g => g.name === selectedCust.customer_group);
                    if (group && group.default_price_list) {
                      pl = group.default_price_list;
                    }
                  }
                  if (pl) {
                    setPriceList(pl);
                  }
                }
              }}
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  fullWidth
                  label="Customer"
                  placeholder="Select Customer..."
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <CustomTextField
              fullWidth
              type="date"
              label="Payment Due Date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <CustomTextField
              select
              fullWidth
              label="Price List"
              value={priceList}
              onChange={e => setPriceList(e.target.value)}
            >
              <MenuItem value="Wholesale">Wholesale</MenuItem>
              <MenuItem value="Retail">Retail</MenuItem>
            </CustomTextField>
            <Box sx={{ mt: 1.5 }}>
              <FormControlLabel
                control={
                  <CustomCheckbox
                    checked={gstApplicable}
                    onChange={(e) => setGstApplicable(e.target.checked)}
                    color="primary"
                  />
                }
                label={<Typography variant="subtitle2" fontWeight={600}>GST Applicable</Typography>}
              />
            </Box>
          </Grid>
        </Grid>
      </Box></BlankCard>

      <BlankCard><Box sx={{ p: 3, maxWidth: '100%', overflowX: 'hidden' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Items</Typography>
          <Box display="flex" gap={2}>
            <CustomTextField
              size="small"
              placeholder="Scan Barcode & Press Enter"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeScan}
              sx={{ width: 300 }}
            />
            <Button variant="outlined" startIcon={<IconCamera size={18} />} onClick={() => setIsScannerOpen(true)}>
              Camera
            </Button>
          </Box>
        </Box>
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <Table sx={{ minWidth: 1600 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 60, minWidth: 60, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 2 }}>#</TableCell>
                <TableCell sx={{ width: 185, minWidth: 185, position: 'sticky', left: 60, bgcolor: 'background.paper', zIndex: 2, borderRight: '1px solid', borderColor: 'divider' }}>Item Code</TableCell>
                <TableCell sx={{ minWidth: 160, maxWidth: 260 }}>Item Name</TableCell>
                <TableCell sx={{ width: 170, minWidth: 170 }}>Warehouse</TableCell>
                <TableCell sx={{ width: 100 }}>Carton</TableCell>
                <TableCell sx={{ width: 100 }}>Packing</TableCell>
                <TableCell sx={{ width: 120 }}>Quantity</TableCell>
                <TableCell sx={{ width: 120 }}>Total Wt.</TableCell>
                <TableCell sx={{ width: 120 }}>Rate (System)</TableCell>
                <TableCell sx={{ width: 120 }}>Rate (User)</TableCell>
                <TableCell sx={{ width: 100 }}>Discount (%)</TableCell>
                <TableCell sx={{ width: 120 }}>Discount Amt</TableCell>
                <TableCell sx={{ width: 120 }}>Gross Amt</TableCell>
                <TableCell sx={{ width: 40, p: 0 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, idx) => {
                const qty = Number(item.qty) || 0;
                const rate = Number(item.user_rate) || Number(item.rate) || 0;
                const grossAmount = qty * rate;
                const discountPercentage = Number(item.discount) || 0;
                const discountAmt = grossAmount * (discountPercentage / 100);
                const taxableAmount = grossAmount - discountAmt;
                const gstAmt = taxableAmount * (Number(item.gst_percentage) || 0) / 100;
                const finalNetAmount = taxableAmount + gstAmt;

                return (
                  <TableRow key={idx}>
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                      <Typography variant="body2" fontWeight="bold">{idx + 1}</Typography>
                    </TableCell>
                    <TableCell sx={{ position: 'sticky', left: 60, bgcolor: 'background.paper', zIndex: 1, borderRight: '1px solid', borderColor: 'divider' }}>
                      <Autocomplete
                        open={openRowIndex === idx}
                        onOpen={() => setOpenRowIndex(idx)}
                        onClose={() => {
                          if (openRowIndex === idx) setOpenRowIndex(null);
                        }}
                        openOnFocus
                        autoHighlight
                        options={itemList || []}
                        filterOptions={filterOptions}
                        getOptionLabel={(option) => option.item_code || ''}
                        value={itemList?.find(i => i.item_code === item.item_code) || null}
                        renderOption={(props, option) => {
                          const { key, ...restProps } = props;
                          return (
                            <li key={key} {...restProps} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 16px' }}>
                              <Typography variant="body1" sx={{ lineHeight: 1.2 }}>{option.item_code}</Typography>
                              <Typography variant="caption" color="textSecondary">{option.item_name}</Typography>
                            </li>
                          );
                        }}
                        onChange={(e, newValue) => {
                          setOpenRowIndex(null);
                          if (newValue) {
                            const existingIndex = items.findIndex((i, index) => i.item_code === newValue.item_code && index !== idx);
                            if (existingIndex >= 0) {
                              toast.error(`Item ${newValue.item_code} has already been added in row ${existingIndex + 1}!`);
                              return;
                            }
                          }

                          const newItems = [...items];
                          if (newValue) {
                            newItems[idx].item_code = newValue.item_code;
                            newItems[idx].item_name = newValue.item_name;
                            if (!newItems[idx].warehouse) {
                              newItems[idx].warehouse = defaultWarehouse || warehouses[0]?.name || '';
                            }
                            newItems[idx].rate = getPrice(newValue.item_code) || newValue.standard_rate || 0;
                            newItems[idx].user_rate = '';
                            newItems[idx].carton = '';
                            newItems[idx].packing = newValue.packing_from_item || '';
                            newItems[idx].weight_per_unit = newValue.weight_per_unit || 0;
                            newItems[idx].qty = '';
                            newItems[idx].total_weight = '';
                            newItems[idx].discount = '';
                            newItems[idx].gst_percentage = newValue.gst_percentage || 0;
                          } else {
                            newItems[idx].item_code = '';
                            newItems[idx].item_name = '';
                            newItems[idx].rate = 0;
                            newItems[idx].user_rate = '';
                            newItems[idx].carton = '';
                            newItems[idx].packing = '';
                            newItems[idx].weight_per_unit = 0;
                            newItems[idx].qty = '';
                            newItems[idx].total_weight = '';
                            newItems[idx].discount = '';
                            newItems[idx].gst_percentage = 0;
                          }
                          setItems(newItems);
                        }}
                        renderInput={(params) => (
                          <CustomTextField
                            {...params}
                            autoFocus={openRowIndex === idx}
                            inputRef={(el) => {
                              if (params.inputProps?.ref) {
                                if (typeof params.inputProps.ref === 'function') {
                                  params.inputProps.ref(el);
                                } else {
                                  params.inputProps.ref.current = el;
                                }
                              }
                              if (focusRowIndexRef.current === idx && el) {
                                focusRowIndexRef.current = null;
                                setTimeout(() => {
                                  el.focus();
                                }, 50);
                              }
                            }}
                            placeholder="Search Item..."
                            variant="outlined"
                            size="small"
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 160, maxWidth: 260, verticalAlign: 'top' }}>
                      <ExpandableItemName text={item.item_name} />
                    </TableCell>
                    <TableCell sx={{ minWidth: 170, width: 170, verticalAlign: 'top' }}>
                      <CustomTextField
                        select
                        size="small"
                        fullWidth
                        value={item.warehouse || ''}
                        onChange={e => {
                          const val = e.target.value;
                          const newItems = [...items];
                          newItems[idx].warehouse = val;
                          setItems(newItems);
                        }}
                        SelectProps={{
                          displayEmpty: true,
                          renderValue: (selected) => {
                            if (!selected) return <span style={{ color: '#aaa' }}>Select Warehouse</span>;
                            return selected;
                          }
                        }}
                      >
                        <MenuItem value="" disabled>
                          <em>Select Warehouse</em>
                        </MenuItem>
                        {warehouses.map(wh => {
                          const bal = item.item_code ? (binMap[`${item.item_code}:::${wh.name}`] ?? 0) : 0;
                          return (
                            <MenuItem key={wh.name} value={wh.name}>
                              <Box display="flex" justifyContent="space-between" alignItems="center" width="100%" gap={2}>
                                <Typography variant="body2">{wh.name}</Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 600,
                                    color: item.item_code ? (bal > 0 ? 'success.main' : 'text.disabled') : 'text.disabled',
                                    bgcolor: item.item_code && bal > 0 ? 'success.lighter' : 'action.hover',
                                    px: 0.8,
                                    py: 0.2,
                                    borderRadius: 1
                                  }}
                                >
                                  {item.item_code ? `Bal: ${bal}` : 'Bal: -'}
                                </Typography>
                              </Box>
                            </MenuItem>
                          );
                        })}
                      </CustomTextField>
                      {item.warehouse && (
                        <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Bal Qty:
                          </Typography>
                          <Typography
                            variant="caption"
                            fontWeight="bold"
                            color={
                              !item.item_code
                                ? 'text.secondary'
                                : (binMap[`${item.item_code}:::${item.warehouse}`] ?? 0) > 0
                                ? 'success.main'
                                : 'error.main'
                            }
                          >
                            {item.item_code ? (binMap[`${item.item_code}:::${item.warehouse}`] ?? 0) : '-'}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <CustomTextField size="small" value={item.carton} disabled={!!item.qty && !item.carton} onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          const newItems = [...items];
                          newItems[idx].carton = val;
                          if (val || newItems[idx].packing) {
                            const newQty = (Number(val) || 0) * (Number(newItems[idx].packing) || 0);
                            newItems[idx].qty = newQty;
                            newItems[idx].total_weight = newQty * (Number(newItems[idx].weight_per_unit) || 0);
                          } else {
                            newItems[idx].qty = '';
                            newItems[idx].total_weight = '';
                          }
                          setItems(newItems);
                        }
                      }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{item.packing || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <CustomTextField size="small" value={item.qty} disabled={!!item.carton} onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          const newItems = [...items];
                          newItems[idx].qty = val;
                          newItems[idx].total_weight = (Number(val) || 0) * (Number(newItems[idx].weight_per_unit) || 0);
                          setItems(newItems);
                        }
                      }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{item.total_weight || ((Number(item.qty) || 0) * (Number(item.weight_per_unit) || 0)).toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">₹{(Number(item.rate) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                    </TableCell>
                    <TableCell>
                      <CustomTextField size="small" placeholder="Rate..." value={item.user_rate} onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          const newItems = [...items];
                          newItems[idx].user_rate = val;
                          setItems(newItems);
                        }
                      }} />
                    </TableCell>
                    <TableCell>
                      <CustomTextField size="small" placeholder="%" value={item.discount} onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                          const newItems = [...items];
                          newItems[idx].discount = val;
                          setItems(newItems);
                        }
                      }} />
                    </TableCell>
                    <TableCell>₹{discountAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>₹{grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell sx={{ p: 0, textAlign: 'center' }}>
                      <IconButton color="error" onClick={() => removeItem(idx)}><IconTrash size={18} /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Dynamic Totals Row */}
              {(() => {
                let totalCarton = 0;
                let totalQty = 0;
                let totalWeight = 0;
                let totalGross = 0;
                let totalDiscount = 0;

                items.forEach(item => {
                  const ctn = Number(item.carton) || 0;
                  const qty = Number(item.qty) || 0;
                  const rate = Number(item.user_rate) || Number(item.rate) || 0;
                  const gross = qty * rate;
                  const discPct = Number(item.discount) || 0;
                  const discAmt = gross > 0 ? gross * (discPct / 100) : 0;
                  const wt = Number(item.total_weight) || (qty * (Number(item.weight_per_unit) || 0));

                  totalCarton += ctn;
                  totalQty += qty;
                  totalWeight += wt;
                  totalGross += gross;
                  totalDiscount += discAmt;
                });

                return (
                  <TableRow sx={{ bgcolor: 'action.hover', borderTop: '2px solid', borderColor: 'divider' }}>
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold">Total</Typography>
                    </TableCell>
                    <TableCell sx={{ position: 'sticky', left: 60, bgcolor: 'background.paper', zIndex: 1, borderRight: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary">({items.length} {items.length === 1 ? 'item' : 'items'})</Typography>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {totalCarton > 0 ? totalCarton : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {totalQty > 0 ? totalQty.toLocaleString() : '0'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {totalWeight > 0 ? totalWeight.toFixed(2) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
                        ₹{totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
                        ₹{totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                );
              })()}
            </TableBody>
          </Table>
        </Box>
        <Button sx={{ mt: 2 }} onClick={addItem}>+ Add Row</Button>
      </Box></BlankCard>

      {(() => {
        const gstBreakup = {};
        let total = 0;
        let total_taxes = 0;
        let total_discount = 0;
        let grand_total = 0;

        items?.forEach(item => {
          const qty = Number(item.qty) || 0;
          const rate = Number(item.user_rate) || Number(item.rate) || 0;
          const grossAmount = qty * rate;
          const discountPercentage = Number(item.discount) || 0;
          const discountAmt = grossAmount > 0 ? grossAmount * (discountPercentage / 100) : 0;
          const taxableAmount = grossAmount - discountAmt;

          total += grossAmount;
          total_discount += discountAmt;

          if (gstApplicable) {
            const gst_percentage = Number(item.gst_percentage) || 0;
            if (gst_percentage > 0) {
              const cgstRate = gst_percentage / 2;
              const sgstRate = gst_percentage / 2;
              const cgstAmt = taxableAmount * (cgstRate / 100);
              const sgstAmt = taxableAmount * (sgstRate / 100);
              const totalTax = cgstAmt + sgstAmt;
              total_taxes += totalTax;

              if (!gstBreakup[gst_percentage]) {
                gstBreakup[gst_percentage] = { taxable: 0, cgst: 0, sgst: 0, total_tax: 0 };
              }
              gstBreakup[gst_percentage].taxable += taxableAmount;
              gstBreakup[gst_percentage].cgst += cgstAmt;
              gstBreakup[gst_percentage].sgst += sgstAmt;
              gstBreakup[gst_percentage].total_tax += totalTax;
            }
          }
        });

        const transportChargeVal = Number(transportationCharges) || 0;
        const packingChargeVal = Number(packagingCharges) || 0;
        grand_total = total - total_discount + (gstApplicable ? total_taxes : 0) + transportChargeVal + packingChargeVal;
        const rounded_total = Math.round(grand_total);
        const rounding_adjustment = rounded_total - grand_total;

        return (
          <>
            {gstApplicable && Object.keys(gstBreakup).length > 0 && (
              <BlankCard><Box sx={{ mb: 4, overflow: 'hidden' }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>GST Rate</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Taxable Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>CGST Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>SGST Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Total Tax</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(gstBreakup).map(([rate, data]) => (
                        <TableRow key={rate}>
                          <TableCell>{rate}%</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>₹{data.taxable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>₹{data.cgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>₹{data.sgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>₹{data.total_tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box></BlankCard>
            )}

            <Box mb={4}>
              <BlankCard>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={3} sx={{ p: 3 }}>
                  <Box sx={{ width: { xs: '100%', md: '280px' } }}>
                    <Typography variant="subtitle1" fontWeight="bold" mb={2}>Additional Charges</Typography>
                    <Box display="flex" flexDirection="column" gap={2}>
                      <CustomTextField
                        fullWidth
                        label="Transportation Charges"
                        value={transportationCharges}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setTransportationCharges(val);
                          }
                        }}
                      />
                      <CustomTextField
                        fullWidth
                        label="Packaging Charges"
                        value={packagingCharges}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setPackagingCharges(val);
                          }
                        }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ width: { xs: '100%', md: '280px' } }}>
                    <Typography variant="subtitle1" fontWeight="bold" mb={2}>Transportation Details</Typography>
                    <Box display="flex" flexDirection="column" gap={2}>
                      <Autocomplete
                        options={transporters || []}
                        getOptionLabel={(option) => typeof option === 'string' ? option : (option.supplier_name && option.supplier_name !== option.name ? `${option.supplier_name} (${option.name})` : option.name || '')}
                        isOptionEqualToValue={(option, val) => option?.name === (typeof val === 'string' ? val : val?.name)}
                        value={transporters?.find(t => t.name === transporter) || (transporter ? { name: transporter, supplier_name: transporter } : null)}
                        onChange={(e, newValue) => setTransporter(newValue ? newValue.name : '')}
                        renderInput={(params) => (
                          <CustomTextField
                            {...params}
                            fullWidth
                            label="Transporter"
                            placeholder="Select Transporter..."
                          />
                        )}
                      />
                      <CustomTextField
                        fullWidth
                        label="Driver Name"
                        placeholder="Enter driver name"
                        value={driverName}
                        onChange={e => setDriverName(e.target.value)}
                      />
                      <CustomTextField
                        fullWidth
                        label="Vehicle No"
                        placeholder="e.g. KA49S1616"
                        value={vehicleNo}
                        onChange={e => setVehicleNo(e.target.value.toUpperCase())}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ width: { xs: '100%', md: '300px' } }}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">Total</Typography>
                      <Typography variant="body2">₹{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                    </Box>
                    {total_discount > 0 && (
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" color="text.secondary">Total Discount</Typography>
                        <Typography variant="body2" color="error.main">-₹{total_discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                      </Box>
                    )}
                    {gstApplicable && (
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" color="text.secondary">Taxes</Typography>
                        <Typography variant="body2">₹{total_taxes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                      </Box>
                    )}
                    {transportChargeVal > 0 && (
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" color="text.secondary">Transportation Charges</Typography>
                        <Typography variant="body2">₹{transportChargeVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                      </Box>
                    )}
                    {packingChargeVal > 0 && (
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" color="text.secondary">Packaging Charges</Typography>
                        <Typography variant="body2">₹{packingChargeVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                      </Box>
                    )}
                    <Box display="flex" justifyContent="space-between" mb={1} pt={1} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="subtitle1" fontWeight="bold">Grand Total</Typography>
                      <Typography variant="subtitle1" fontWeight="bold">₹{grand_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                    </Box>
                    {rounding_adjustment !== 0 && (
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" color="text.secondary">Rounding Adjustment</Typography>
                        <Typography variant="body2">₹{rounding_adjustment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                      </Box>
                    )}
                    {rounded_total > 0 && rounded_total !== grand_total && (
                      <Box display="flex" justifyContent="space-between" mb={1} pt={1} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle1" fontWeight="bold">Rounded Total</Typography>
                        <Typography variant="subtitle1" fontWeight="bold">₹{rounded_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </BlankCard>
            </Box>
          </>
        );
      })()}

      <Dialog
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Scan Barcode</DialogTitle>
        <DialogContent>
          {isScannerOpen && <BarcodeScanner onScan={(text) => { setIsScannerOpen(false); processBarcode(text); }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsScannerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const BarcodeScanner = ({ onScan }) => {
  useEffect(() => {
    // Prevent double-initialization in React Strict Mode
    const readerElement = document.getElementById("reader");
    if (readerElement && readerElement.innerHTML !== "") {
      return;
    }

    const scanner = new Html5QrcodeScanner("reader", {
      qrbox: { width: 350, height: 150 }, // Optimized for wider 1D barcodes
      fps: 10, // Increased FPS for faster scanning
      rememberLastUsedCamera: true,
      supportedScanTypes: [0] // 0 = Camera only (avoids file upload clutter if unwanted, but we can leave it default)
    });

    scanner.render((decodedText) => {
      scanner.clear();
      if (onScan) onScan(decodedText);
    }, (error) => {
      // Ignore searching errors
    });

    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
    };
  }, [onScan]);

  return <Box id="reader" width="100%"></Box>;
};

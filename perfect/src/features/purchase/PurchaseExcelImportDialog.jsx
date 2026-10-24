import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  IconButton,
  Avatar,
  Autocomplete,
  Alert,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  IconUpload,
  IconX,
  IconAlertTriangle,
  IconCheck,
  IconPlus,
  IconFileSpreadsheet,
  IconAlertCircle,
  IconRefresh
} from '@tabler/icons-react';
import CustomTextField from '../../components/forms/theme-elements/CustomTextField';
import { useFrappePostCall, useFrappeGetDocList } from 'frappe-react-sdk';
import toast from 'react-hot-toast';

export default function PurchaseExcelImportDialog({
  open,
  onClose,
  onImportItems,
  existingPurchaseItems = [],
  mutateItemList
}) {
  const theme = useTheme();

  // State
  const [file, setFile] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCreatingItems, setIsCreatingItems] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationData, setValidationData] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0: All, 1: Mismatches, 2: Missing, 3: Invalid
  const [editedRows, setEditedRows] = useState([]);
  const [confirmPartialModalOpen, setConfirmPartialModalOpen] = useState(false);

  // Frappe Hooks
  const { data: categories } = useFrappeGetDocList('Item Category', { fields: ['name'], limit: 1000 });
  const { data: subCategories } = useFrappeGetDocList('Item Sub Category', { fields: ['name'], limit: 1000 });
  const { call: validateExcelCall } = useFrappePostCall('goldretail.api.purchase_import.validate_purchase_excel');
  const { call: createMissingItemsCall } = useFrappePostCall('goldretail.api.purchase_import.create_missing_items');
  const { call: updateItemPricesCall } = useFrappePostCall('goldretail.api.purchase_import.update_item_prices_from_import');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xlsm)$/i)) {
      toast.error('Please upload a valid Excel file (.xlsx format).');
      return;
    }
    setFile(selectedFile);
  };

  const handleUploadAndValidate = async () => {
    if (!file) {
      toast.error('Please select an Excel file to upload.');
      return;
    }

    setIsValidating(true);
    const toastId = toast.loading('Uploading and validating Excel file...');

    try {
      const data = new FormData();
      data.append('file', file, file.name);
      data.append('is_private', 0);
      data.append('folder', 'Home/Attachments');

      const uploadRes = await fetch('/api/method/upload_file', {
        method: 'POST',
        body: data,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload Excel file to server.');
      }

      const uploadJson = await uploadRes.json();
      const fileUrl = uploadJson.message?.file_url;
      if (!fileUrl) {
        throw new Error('File URL not returned from server.');
      }

      const res = await validateExcelCall({ file_url: fileUrl });
      const valResult = res.message;

      if (!valResult || !valResult.rows) {
        throw new Error('Invalid validation response from server.');
      }

      setValidationData(valResult);
      setEditedRows(valResult.rows.map(r => ({ ...r })));
      toast.success('Excel validated successfully!', { id: toastId });

      // Automatically switch to missing items tab if there are missing items
      if (valResult.summary?.new_items > 0) {
        setActiveTab(2);
      } else if (valResult.summary?.existing_mismatch > 0) {
        setActiveTab(1);
      } else {
        setActiveTab(0);
      }
    } catch (err) {
      toast.error(err.message || 'Error processing Excel file', { id: toastId });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRowChange = (index, field, value) => {
    setEditedRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const renderPriceCell = (row, originalIdx, field, currentRateField, label) => {
    const val = row[field];
    const currVal = row[currentRateField];
    const numVal = val !== '' && val !== null && val !== undefined ? Number(val) : null;
    const numCurr = currVal !== '' && currVal !== null && currVal !== undefined ? Number(currVal) : null;

    const hasNewVal = numVal !== null && !isNaN(numVal) && numVal > 0;
    const hasCurrVal = numCurr !== null && !isNaN(numCurr) && numCurr > 0;

    const isChanged = hasNewVal && (!hasCurrVal || Math.abs(numVal - numCurr) > 0.001);
    const isUnchanged = hasNewVal && hasCurrVal && Math.abs(numVal - numCurr) <= 0.001;

    return (
      <Box sx={{ minWidth: 125 }}>
        <CustomTextField
          size="small"
          type="number"
          value={val ?? ''}
          placeholder="0.00"
          onChange={(e) => handleRowChange(originalIdx, field, e.target.value)}
          sx={{
            width: 100,
            ...(isChanged && {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: `${theme.palette.warning.main} !important`,
                borderWidth: '2px !important',
              },
              backgroundColor: 'rgba(255, 174, 31, 0.08)',
              borderRadius: 1
            })
          }}
        />
        {isChanged && (
          <Box mt={0.5}>
            <Tooltip title={hasCurrVal ? `Current database price: ₹${numCurr}. Importing will update this to ₹${numVal}.` : `No price currently set. Importing will set price to ₹${numVal}.`}>
              <Chip
                size="small"
                label={hasCurrVal ? `₹${numCurr} → ₹${numVal}` : `New: ₹${numVal}`}
                color={hasCurrVal ? 'warning' : 'success'}
                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600, px: 0.5 }}
              />
            </Tooltip>
          </Box>
        )}
        {isUnchanged && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, fontSize: '0.72rem' }}>
            Unchanged (₹{numCurr})
          </Typography>
        )}
        {!hasNewVal && (
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5, fontSize: '0.72rem' }}>
            {hasCurrVal ? `Current: ₹${numCurr}` : 'No update'}
          </Typography>
        )}
      </Box>
    );
  };

  // Create Missing Items Workflow
  const handleSaveAndCreateItems = async () => {
    const missingRows = editedRows.filter(r => r.status === 'new_item');
    if (missingRows.length === 0) {
      toast.info('No missing items to create.');
      return;
    }

    // Validate required fields
    for (const r of missingRows) {
      if (!r.item_code || !r.item_name) {
        toast.error(`Item Code and Item Name are mandatory for all rows.`);
        return;
      }
      if (!r.excel_pcs_ctn || Number(r.excel_pcs_ctn) <= 0) {
        toast.error(`Invalid Pieces per Carton for item ${r.item_code}. Must be greater than 0.`);
        return;
      }
    }

    setIsCreatingItems(true);
    const toastId = toast.loading(`Creating ${missingRows.length} item(s)...`);

    try {
      const payload = missingRows.map(r => ({
        item_code: r.item_code,
        item_name: r.item_name,
        category: r.category || null,
        sub_category: r.sub_category || null,
        description: r.description || '',
        pcs_per_ctn: Number(r.excel_pcs_ctn),
        image_preview: r.image_preview || null,
        purchase_rate: r.purchase_rate !== '' && r.purchase_rate !== null && r.purchase_rate !== undefined ? Number(r.purchase_rate) : null,
        wholesale_rate: r.wholesale_rate !== '' && r.wholesale_rate !== null && r.wholesale_rate !== undefined ? Number(r.wholesale_rate) : null,
        retail_rate: r.retail_rate !== '' && r.retail_rate !== null && r.retail_rate !== undefined ? Number(r.retail_rate) : null,
      }));

      const res = await createMissingItemsCall({ items: payload });
      const result = res.message;

      if (result.success) {
        const createdCodes = new Set((result.created || []).map(c => c.item_code));

        // Update row statuses to 'existing_match'
        setEditedRows(prev => prev.map(r => {
          if (createdCodes.has(r.item_code)) {
            return {
              ...r,
              status: 'existing_match',
              db_carton_qty: r.excel_pcs_ctn,
              current_purchase_rate: r.purchase_rate ? Number(r.purchase_rate) : r.current_purchase_rate,
              current_wholesale_rate: r.wholesale_rate ? Number(r.wholesale_rate) : r.current_wholesale_rate,
              current_retail_rate: r.retail_rate ? Number(r.retail_rate) : r.current_retail_rate,
            };
          }
          return r;
        }));

        // Refresh master item list
        if (mutateItemList) {
          await mutateItemList();
        }

        if (result.failed && result.failed.length > 0) {
          toast.error(`Created ${result.created.length} items, but ${result.failed.length} failed.`, { id: toastId });
        } else {
          toast.success(`Successfully created ${result.created.length} item(s)!`, { id: toastId });
          setActiveTab(0); // Switch to All tab
        }
      } else {
        toast.error('Item creation failed.', { id: toastId });
      }
    } catch (err) {
      toast.error(err.message || 'Error creating items', { id: toastId });
    } finally {
      setIsCreatingItems(false);
    }
  };

  // Perform Final Import into PurchaseForm items table
  const handleProceedImport = () => {
    const missingUncreated = editedRows.filter(r => r.status === 'new_item');
    if (missingUncreated.length > 0) {
      setConfirmPartialModalOpen(true);
      return;
    }
    executeImport(false);
  };

  const executeImport = async (partialConfirmed = false) => {
    // Eligible rows are existing_match and existing_mismatch
    const eligibleRows = editedRows.filter(r => r.status === 'existing_match' || r.status === 'existing_mismatch');

    if (eligibleRows.length === 0) {
      toast.error('No eligible rows to import. Please create missing items first or resolve invalid rows.');
      return;
    }

    setIsImporting(true);
    const toastId = toast.loading('Importing items and updating price lists...');

    try {
      // 1. Update prices in Item Price list for rows that have rates
      const priceItems = eligibleRows
        .map(r => ({
          item_code: r.item_code,
          purchase_rate: r.purchase_rate !== '' && r.purchase_rate !== null && r.purchase_rate !== undefined ? Number(r.purchase_rate) : null,
          wholesale_rate: r.wholesale_rate !== '' && r.wholesale_rate !== null && r.wholesale_rate !== undefined ? Number(r.wholesale_rate) : null,
          retail_rate: r.retail_rate !== '' && r.retail_rate !== null && r.retail_rate !== undefined ? Number(r.retail_rate) : null,
        }))
        .filter(p => (p.purchase_rate && p.purchase_rate > 0) || (p.wholesale_rate && p.wholesale_rate > 0) || (p.retail_rate && p.retail_rate > 0));

      if (priceItems.length > 0) {
        await updateItemPricesCall({ items: priceItems });
      }

      // 2. Map to PurchaseForm items schema
      const newPurchaseItems = eligibleRows.map(r => {
        const carton = Number(r.carton_count) || 0;
        const packing = Number(r.excel_pcs_ctn) || 0;
        const qty = Number(r.total_qty) || (carton * packing);
        const rate = r.purchase_rate !== '' && r.purchase_rate !== null && r.purchase_rate !== undefined ? Number(r.purchase_rate) : 0;

        return {
          item_code: r.item_code,
          item_name: r.item_name || '',
          description: r.description || '',
          carton: carton > 0 ? carton : '',
          packing: packing > 0 ? packing : '',
          qty: qty > 0 ? qty : '',
          rate: rate > 0 ? rate : 0,
          total_weight: '',
          discount: '',
          // Keep reference to db carton qty for pre-submission mismatch check
          imported_master_packing: r.db_carton_qty
        };
      });

      onImportItems(newPurchaseItems);
      toast.success(`Successfully imported ${newPurchaseItems.length} item(s)!`, { id: toastId });
      setConfirmPartialModalOpen(false);
      handleReset();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error updating price lists or importing items', { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidationData(null);
    setEditedRows([]);
    setActiveTab(0);
  };

  // Filtered rows for current tab
  const displayedRows = editedRows.filter(r => {
    if (activeTab === 0) return r.status === 'existing_match' || r.status === 'existing_mismatch';
    if (activeTab === 1) return r.status === 'existing_mismatch';
    if (activeTab === 2) return r.status === 'new_item';
    if (activeTab === 3) return r.status === 'invalid';
    return true;
  });

  const summary = {
    total: editedRows.length,
    match: editedRows.filter(r => r.status === 'existing_match').length,
    mismatch: editedRows.filter(r => r.status === 'existing_mismatch').length,
    missing: editedRows.filter(r => r.status === 'new_item').length,
    invalid: editedRows.filter(r => r.status === 'invalid').length,
    priceChanges: editedRows.filter(r => {
      if (r.status !== 'existing_match' && r.status !== 'existing_mismatch') return false;
      const pChg = r.purchase_rate !== '' && r.purchase_rate !== null && r.purchase_rate !== undefined && (!r.current_purchase_rate || Math.abs(Number(r.purchase_rate) - Number(r.current_purchase_rate)) > 0.001);
      const wChg = r.wholesale_rate !== '' && r.wholesale_rate !== null && r.wholesale_rate !== undefined && (!r.current_wholesale_rate || Math.abs(Number(r.wholesale_rate) - Number(r.current_wholesale_rate)) > 0.001);
      const rChg = r.retail_rate !== '' && r.retail_rate !== null && r.retail_rate !== undefined && (!r.current_retail_rate || Math.abs(Number(r.retail_rate) - Number(r.current_retail_rate)) > 0.001);
      return pChg || wChg || rChg;
    }).length,
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth PaperProps={{ sx: { minHeight: '80vh', maxHeight: '90vh' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <IconFileSpreadsheet size={24} color={theme.palette.primary.main} />
            <Typography variant="h6" fontWeight="bold">Import Purchase Items from Excel</Typography>
          </Box>
          <IconButton onClick={onClose} size="small"><IconX size={20} /></IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Step 1: File Upload Bar */}
          {!validationData ? (
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                p: 6,
                textAlign: 'center',
                backgroundColor: 'background.default',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}
            >
              <IconUpload size={48} color={theme.palette.text.secondary} />
              <Typography variant="h6">Select Excel Spreadsheet (.xlsx)</Typography>
              <Typography variant="body2" color="text.secondary">
                Upload your purchase invoice spreadsheet containing ITEM NO., PCS/CTN, CTN, and product images.
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mt={1}>
                <input
                  type="file"
                  accept=".xlsx, .xlsm"
                  id="excel-file-upload-input"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <label htmlFor="excel-file-upload-input">
                  <Button variant="outlined" component="span" startIcon={<IconFileSpreadsheet size={18} />}>
                    {file ? file.name : 'Choose File'}
                  </Button>
                </label>
                <Button
                  variant="contained"
                  disabled={!file || isValidating}
                  onClick={handleUploadAndValidate}
                  startIcon={isValidating ? <CircularProgress size={18} color="inherit" /> : <IconCheck size={18} />}
                >
                  {isValidating ? 'Validating...' : 'Upload & Validate'}
                </Button>
              </Box>
            </Box>
          ) : (
            /* Step 2: Validation Summary & Tabs */
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Summary Metrics Bar */}
              <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center" justifyContent="space-between" p={1.5} sx={{ backgroundColor: 'background.default', borderRadius: 2 }}>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  <Chip
                    label={`Total Rows: ${summary.total}`}
                    variant="outlined"
                  />
                  <Chip
                    color="success"
                    icon={<IconCheck size={16} />}
                    label={`Carton Match: ${summary.match}`}
                    variant={activeTab === 0 ? 'filled' : 'outlined'}
                    onClick={() => setActiveTab(0)}
                  />
                  <Chip
                    color="warning"
                    icon={<IconAlertTriangle size={16} />}
                    label={`Carton Mismatches: ${summary.mismatch}`}
                    variant={activeTab === 1 ? 'filled' : 'outlined'}
                    onClick={() => setActiveTab(1)}
                  />
                  <Chip
                    color="info"
                    icon={<IconPlus size={16} />}
                    label={`Items Not Found: ${summary.missing}`}
                    variant={activeTab === 2 ? 'filled' : 'outlined'}
                    onClick={() => setActiveTab(2)}
                  />
                  {summary.priceChanges > 0 && (
                    <Chip
                      color="secondary"
                      label={`Price Updates: ${summary.priceChanges}`}
                      variant="outlined"
                    />
                  )}
                  {summary.invalid > 0 && (
                    <Chip
                      color="error"
                      icon={<IconAlertCircle size={16} />}
                      label={`Invalid Rows: ${summary.invalid}`}
                      variant={activeTab === 3 ? 'filled' : 'outlined'}
                      onClick={() => setActiveTab(3)}
                    />
                  )}
                </Box>
                <Button size="small" variant="text" startIcon={<IconRefresh size={16} />} onClick={handleReset}>
                  Re-upload Different File
                </Button>
              </Box>

              {/* Navigation Tabs */}
              <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
                <Tab label={`Eligible Items (${summary.match + summary.mismatch})`} />
                <Tab
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <span>Carton Mismatches</span>
                      {summary.mismatch > 0 && <Chip size="small" color="warning" label={summary.mismatch} />}
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <span>Items Not Found</span>
                      {summary.missing > 0 && <Chip size="small" color="info" label={summary.missing} />}
                    </Box>
                  }
                />
                {summary.invalid > 0 && (
                  <Tab
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>Invalid Rows</span>
                        <Chip size="small" color="error" label={summary.invalid} />
                      </Box>
                    }
                  />
                )}
              </Tabs>

              {/* TAB 0 & 1: Eligible Items & Carton Mismatches */}
              {(activeTab === 0 || activeTab === 1) && (
                <Box sx={{ overflowX: 'auto', maxHeight: '50vh' }}>
                  {displayedRows.length === 0 ? (
                    <Typography color="text.secondary" p={4} textAlign="center">
                      No rows matching current filter.
                    </Typography>
                  ) : (
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 45 }}>S.No.</TableCell>
                          <TableCell sx={{ width: 60 }}>Image</TableCell>
                          <TableCell sx={{ minWidth: 120 }}>Item Code</TableCell>
                          <TableCell sx={{ minWidth: 160 }}>Item Name</TableCell>
                          <TableCell sx={{ minWidth: 130 }}>
                            <Tooltip title="Price at which item is purchased. Updates Standard Buying price list and Purchase Form rate.">
                              <span>Purchase Rate (₹)</span>
                            </Tooltip>
                          </TableCell>
                          <TableCell sx={{ minWidth: 130 }}>
                            <Tooltip title="Price to update in Wholesale price list.">
                              <span>Wholesale Rate (₹)</span>
                            </Tooltip>
                          </TableCell>
                          <TableCell sx={{ minWidth: 130 }}>
                            <Tooltip title="Price to update in Retail price list.">
                              <span>Retail Rate (₹)</span>
                            </Tooltip>
                          </TableCell>
                          <TableCell sx={{ minWidth: 140 }}>Pieces / Carton (PCS/CTN)</TableCell>
                          <TableCell sx={{ width: 90 }}>Cartons (CTN)</TableCell>
                          <TableCell sx={{ width: 100 }}>Total Qty (PCS)</TableCell>
                          <TableCell sx={{ width: 130 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {displayedRows.map((row, idx) => {
                          const isMismatch = row.status === 'existing_mismatch';
                          const originalIdx = editedRows.findIndex(r => r.row_num === row.row_num);

                          return (
                            <TableRow key={row.row_num} hover>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>
                                <Avatar
                                  src={row.image_preview}
                                  variant="rounded"
                                  sx={{ width: 40, height: 40, bgcolor: 'action.hover' }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">{row.item_code}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
                                  {row.item_name}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {renderPriceCell(row, originalIdx, 'purchase_rate', 'current_purchase_rate', 'Purchase Rate')}
                              </TableCell>
                              <TableCell>
                                {renderPriceCell(row, originalIdx, 'wholesale_rate', 'current_wholesale_rate', 'Wholesale Rate')}
                              </TableCell>
                              <TableCell>
                                {renderPriceCell(row, originalIdx, 'retail_rate', 'current_retail_rate', 'Retail Rate')}
                              </TableCell>
                              <TableCell>
                                {/* Highlight mismatched PCS/CTN value with visible red outline */}
                                {isMismatch ? (
                                  <Box
                                    sx={{
                                      border: '2px solid',
                                      borderColor: 'error.main',
                                      borderRadius: 1,
                                      p: 0.75,
                                      backgroundColor: 'rgba(250, 137, 107, 0.08)'
                                    }}
                                  >
                                    <Box display="flex" alignItems="center" gap={1}>
                                      <Typography variant="body2" fontWeight="bold" color="error.main">
                                        Excel: {row.excel_pcs_ctn}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        (Master: {row.db_carton_qty ?? 'None'})
                                      </Typography>
                                    </Box>
                                    <CustomTextField
                                      size="small"
                                      type="number"
                                      value={row.excel_pcs_ctn}
                                      onChange={(e) => handleRowChange(originalIdx, 'excel_pcs_ctn', e.target.value)}
                                      sx={{ mt: 0.5, width: 100 }}
                                    />
                                  </Box>
                                ) : (
                                  <Typography variant="body2" fontWeight="medium">
                                    {row.excel_pcs_ctn}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <CustomTextField
                                  size="small"
                                  type="number"
                                  value={row.carton_count}
                                  onChange={(e) => handleRowChange(originalIdx, 'carton_count', e.target.value)}
                                  sx={{ width: 80 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">
                                  {(Number(row.carton_count) || 0) * (Number(row.excel_pcs_ctn) || 0)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {isMismatch ? (
                                  <Chip
                                    size="small"
                                    color="warning"
                                    label="Carton Mismatch"
                                    icon={<IconAlertTriangle size={14} />}
                                  />
                                ) : (
                                  <Chip
                                    size="small"
                                    color="success"
                                    label="Carton Matches"
                                    icon={<IconCheck size={14} />}
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              )}

              {/* TAB 2: Items Not Found — Create Items Before Importing */}
              {activeTab === 2 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight="bold" color="info.main">
                      Items Not Found — Create Items Before Importing ({summary.missing})
                    </Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={isCreatingItems || summary.missing === 0}
                      onClick={handleSaveAndCreateItems}
                      startIcon={isCreatingItems ? <CircularProgress size={16} color="inherit" /> : <IconPlus size={16} />}
                    >
                      {isCreatingItems ? 'Creating Items...' : 'Save and Create Items'}
                    </Button>
                  </Box>

                  <Box sx={{ overflowX: 'auto', maxHeight: '48vh' }}>
                    {displayedRows.length === 0 ? (
                      <Typography color="text.secondary" p={4} textAlign="center">
                        All items already exist in the system! You can proceed to import.
                      </Typography>
                    ) : (
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: 45 }}>S.No.</TableCell>
                            <TableCell sx={{ width: 60 }}>Image</TableCell>
                            <TableCell sx={{ minWidth: 120 }}>Item Code (ITEM NO.)</TableCell>
                            <TableCell sx={{ minWidth: 160 }}>Item Name</TableCell>
                            <TableCell sx={{ minWidth: 110 }}>Purchase Rate (₹)</TableCell>
                            <TableCell sx={{ minWidth: 110 }}>Wholesale Rate (₹)</TableCell>
                            <TableCell sx={{ minWidth: 110 }}>Retail Rate (₹)</TableCell>
                            <TableCell sx={{ minWidth: 140 }}>Item Category</TableCell>
                            <TableCell sx={{ minWidth: 140 }}>Item Subcategory</TableCell>
                            <TableCell sx={{ width: 100 }}>Qty / Carton</TableCell>
                            <TableCell sx={{ minWidth: 180 }}>Description</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {displayedRows.map((row, idx) => {
                            const originalIdx = editedRows.findIndex(r => r.row_num === row.row_num);

                            return (
                              <TableRow key={row.row_num} hover>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>
                                  <Avatar
                                    src={row.image_preview}
                                    variant="rounded"
                                    sx={{ width: 44, height: 44, bgcolor: 'action.hover' }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="bold">{row.item_code}</Typography>
                                </TableCell>
                                <TableCell>
                                  <CustomTextField
                                    size="small"
                                    fullWidth
                                    value={row.item_name}
                                    onChange={(e) => handleRowChange(originalIdx, 'item_name', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <CustomTextField
                                    size="small"
                                    type="number"
                                    placeholder="0.00"
                                    value={row.purchase_rate ?? ''}
                                    onChange={(e) => handleRowChange(originalIdx, 'purchase_rate', e.target.value)}
                                    sx={{ width: 95 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <CustomTextField
                                    size="small"
                                    type="number"
                                    placeholder="0.00"
                                    value={row.wholesale_rate ?? ''}
                                    onChange={(e) => handleRowChange(originalIdx, 'wholesale_rate', e.target.value)}
                                    sx={{ width: 95 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <CustomTextField
                                    size="small"
                                    type="number"
                                    placeholder="0.00"
                                    value={row.retail_rate ?? ''}
                                    onChange={(e) => handleRowChange(originalIdx, 'retail_rate', e.target.value)}
                                    sx={{ width: 95 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Autocomplete
                                    options={categories?.map(c => c.name) || []}
                                    value={row.category || null}
                                    onChange={(e, val) => handleRowChange(originalIdx, 'category', val || '')}
                                    renderInput={(params) => (
                                      <CustomTextField {...params} size="small" placeholder="Select..." />
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Autocomplete
                                    options={subCategories?.map(s => s.name) || []}
                                    value={row.sub_category || null}
                                    onChange={(e, val) => handleRowChange(originalIdx, 'sub_category', val || '')}
                                    renderInput={(params) => (
                                      <CustomTextField {...params} size="small" placeholder="Select..." />
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <CustomTextField
                                    size="small"
                                    type="number"
                                    value={row.excel_pcs_ctn}
                                    onChange={(e) => handleRowChange(originalIdx, 'excel_pcs_ctn', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <CustomTextField
                                    size="small"
                                    multiline
                                    maxRows={2}
                                    fullWidth
                                    value={row.description}
                                    onChange={(e) => handleRowChange(originalIdx, 'description', e.target.value)}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </Box>
                </Box>
              )}

              {/* TAB 3: Invalid Rows */}
              {activeTab === 3 && (
                <Box sx={{ overflowX: 'auto', maxHeight: '48vh' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 80 }}>Row #</TableCell>
                        <TableCell sx={{ minWidth: 140 }}>Item Code</TableCell>
                        <TableCell sx={{ minWidth: 160 }}>Spreadsheet Values</TableCell>
                        <TableCell sx={{ minWidth: 260 }}>Validation Error Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayedRows.map((row) => (
                        <TableRow key={row.row_num} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">Row {row.row_num}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.item_code || '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              PCS/CTN: {row.excel_pcs_ctn || '—'} | CTN: {row.carton_count || '—'} | TOTAL: {row.total_qty || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {row.errors.map((err, i) => (
                              <Typography key={i} variant="body2" color="error.main">
                                • {err}
                              </Typography>
                            ))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={onClose} color="inherit" disabled={isImporting}>
            Cancel
          </Button>
          {validationData && (
            <Button
              variant="contained"
              onClick={handleProceedImport}
              disabled={summary.match + summary.mismatch === 0 || isImporting}
              startIcon={isImporting ? <CircularProgress size={18} color="inherit" /> : <IconCheck size={18} />}
            >
              {isImporting ? 'Importing & Updating Prices...' : `Import ${summary.match + summary.mismatch} Eligible Items into Purchase`}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Partial Import Confirmation Modal */}
      <Dialog
        open={confirmPartialModalOpen}
        onClose={() => setConfirmPartialModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconAlertTriangle color={theme.palette.warning.main} size={22} />
          Uncreated Missing Items
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            There are still <strong>{summary.missing}</strong> missing items that have not been created yet.
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            If you continue, only the <strong>{summary.match + summary.mismatch}</strong> existing items will be imported. Uncreated items will be skipped.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmPartialModalOpen(false)}>Back to Create Items</Button>
          <Button variant="contained" color="warning" onClick={() => executeImport(true)}>
            Import Existing Items Only
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

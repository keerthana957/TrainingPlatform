import React, { useEffect, useRef, useState } from 'react';
import {
  AlignLeft,
  Bold,
  ImagePlus,
  Indent,
  Italic,
  List,
  ListOrdered,
  Outdent,
  RemoveFormatting,
  Save,
  Sparkles,
  Strikethrough,
  Underline,
  X,
} from 'lucide-react';
import { Modality, RadiologyCase } from '../types/radiology';

interface ReportTemplate {
  id: string;
  modality: Modality;
  name: string;
  content: string;
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'tpl-chest',
    modality: 'X-ray',
    name: 'CHEST, 2 VIEWS',
    content: `CHEST, 2 VIEWS

INDICATION: Clinical evaluation.

TECHNIQUE: Frontal and lateral chest radiographs.

COMPARISON: None

FINDINGS:

Cardiac silhouette: Within normal limits.

Mediastinal and hilar silhouettes: Within normal limits.

Lungs: Clear. No focal consolidation, pleural effusion, or pneumothorax.

Pleura: No effusions or pneumothorax.

Osseous structures: Intact thoracic cage.

IMPRESSION:
No acute cardiopulmonary findings.`,
  },
  {
    id: 'tpl-wrist',
    modality: 'X-ray',
    name: 'WRIST, AP / LATERAL',
    content: `WRIST, AP AND LATERAL VIEWS

INDICATION: Post-traumatic wrist pain.

TECHNIQUE: Standard AP and lateral radiographs of the wrist.

COMPARISON: None

FINDINGS:

Bones: Distal radius and ulna evaluated for cortical disruption.

Joint spaces: Radiocarpal and carpal arcs preserved.

Soft tissues: Mild dorsal soft tissue swelling.

IMPRESSION:
Evaluate distal radial metaphysis.`,
  },
  {
    id: 'tpl-head-ct',
    modality: 'CT',
    name: 'CT HEAD WITHOUT CONTRAST',
    content: `CT HEAD WITHOUT CONTRAST

INDICATION: Acute neurological deficit.

TECHNIQUE: Non-contrast axial helical CT images of the brain.

COMPARISON: None

FINDINGS:

Parenchyma: Evaluated for acute hemorrhage, ischemia, or mass effect.

Ventricles and cisterns: Symmetric without midline shift or hydrocephalus.

Extra-axial spaces: No subdural or epidural collection.

Calvarium: Intact.

IMPRESSION:
No acute intracranial abnormality.`,
  },
  {
    id: 'tpl-ruq-us',
    modality: 'US',
    name: 'ULTRASOUND RUQ / BILIARY',
    content: `ULTRASOUND RIGHT UPPER QUADRANT

INDICATION: Postprandial abdominal pain.

TECHNIQUE: Grayscale and Doppler sonography of the right upper quadrant.

COMPARISON: None

FINDINGS:

Liver: Normal parenchymal echotexture without focal lesion.

Gallbladder: Evaluated for intraluminal calculi, acoustic shadowing, and wall thickening.

Biliary tree: Common bile duct normal in caliber.

IMPRESSION:
Cholelithiasis evaluation.`,
  },
];

const PROMPT_OPTIONS = [
  { id: 'structured-findings', label: 'Structured Findings + Impression' },
  { id: 'normal-template', label: 'Normal Template Baseline' },
  { id: 'concise-acute', label: 'Concise Acute Impression' },
];

interface StructuredReportEditorProps {
  activeCase: RadiologyCase;
  value: string;
  onChange: (nextValue: string) => void;
  onRunAiValidation: () => void;
  aiLoading: boolean;
  onSaveCase: () => void;
  saveLabel: string;
  saveDisabled?: boolean;
  extraRightAction?: React.ReactNode;
}

export const StructuredReportEditor: React.FC<StructuredReportEditorProps> = ({
  activeCase,
  value,
  onChange,
  onRunAiValidation,
  aiLoading,
  onSaveCase,
  saveLabel,
  saveDisabled = false,
  extraRightAction,
}) => {
  const [promptNotes, setPromptNotes] = useState(
    `${activeCase.id} · ${activeCase.title}\n${activeCase.clinicalHistory}`
  );
  const [selectedPrompt, setSelectedPrompt] = useState(PROMPT_OPTIONS[0].id);
  const [templateQuery, setTemplateQuery] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [attachedImages, setAttachedImages] = useState<{ name: string; url: string }[]>([]);
  const [textFormat, setTextFormat] = useState('p');

  const editorRef = useRef<HTMLDivElement>(null);

  // Sync shorthand notes and default template when switching cases
  useEffect(() => {
    setPromptNotes(`${activeCase.id} · ${activeCase.title}\n${activeCase.clinicalHistory}`);
    setAttachedImages([]);
    setTemplateQuery('');
    setShowTemplates(false);
  }, [activeCase.id, activeCase.title, activeCase.clinicalHistory]);

  // Keep contentEditable synchronized with external value updates
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerText !== value) {
      el.innerText = value;
    }
  }, [value]);

  const matchingTemplates = REPORT_TEMPLATES.filter((t) => {
    const q = templateQuery.trim().toLowerCase();
    if (!q) return t.modality === activeCase.modality;
    return (
      t.name.toLowerCase().includes(q) ||
      t.modality.toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q)
    );
  });

  const handleApplyTemplate = (tpl: ReportTemplate) => {
    const updated = tpl.content.replace(
      /INDICATION:\s*.*/,
      `INDICATION: ${activeCase.clinicalHistory}`
    );
    onChange(updated);
    setTemplateQuery(tpl.name);
    setShowTemplates(false);
  };

  const handleGenerateReport = () => {
    const baseTemplate =
      REPORT_TEMPLATES.find((t) => t.modality === activeCase.modality) || REPORT_TEMPLATES[0];

    if (selectedPrompt === 'normal-template') {
      const normalText = baseTemplate.content.replace(
        /INDICATION:\s*.*/,
        `INDICATION: ${activeCase.clinicalHistory}`
      );
      onChange(normalText);
      return;
    }

    if (selectedPrompt === 'concise-acute') {
      const notesLine = promptNotes.trim();
      const concise = `${baseTemplate.name}\n\nINDICATION: ${activeCase.clinicalHistory}\n\nFINDINGS:\n${notesLine}\n\nIMPRESSION:\n${activeCase.referenceImpression}`;
      onChange(concise);
      return;
    }

    const structured = `${baseTemplate.name}\n\nINDICATION: ${activeCase.clinicalHistory}\n\nTECHNIQUE: ${
      activeCase.modality === 'X-ray'
        ? 'Standard diagnostic radiographs.'
        : activeCase.modality === 'CT'
        ? 'Non-contrast axial helical CT acquisition.'
        : 'Grayscale and Doppler ultrasound examination.'
    }\n\nCOMPARISON: None\n\nFINDINGS:\n${activeCase.referenceFindings
      .map((f) => `${f}.`)
      .join('\n')}\n\nIMPRESSION:\n${activeCase.referenceImpression}`;
    onChange(structured);
  };

  const execCommand = (command: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    if (editorRef.current) {
      onChange(editorRef.current.innerText);
    }
  };

  const handleAttachImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const added = Array.from(files).map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setAttachedImages((prev) => [...prev, ...added]);
  };

  const handleClear = () => {
    onChange('');
    setPromptNotes('');
    setTemplateQuery('');
    if (editorRef.current) {
      editorRef.current.innerText = '';
    }
  };

  return (
    <div className="bg-[#232323] text-slate-100 rounded-xl border border-[#383838] overflow-hidden flex flex-col">
      {/* Workstation Study Header */}
      <div className="px-5 py-3.5 bg-[#262626] border-b border-[#363636] flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {activeCase.id} · {activeCase.patientAgeSex}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-wide">
            {activeCase.title}
          </p>
        </div>
        <span className="text-xs font-medium text-slate-300 tracking-wide whitespace-nowrap">
          TRAINING PLATFORM
        </span>
      </div>

      <div className="p-4 space-y-3.5">
        {/* Top Dictation / Prompt Generation Box */}
        <div className="bg-[#282828] border border-[#3B3B3B] rounded-lg p-3 space-y-2.5">
          <textarea
            rows={4}
            value={promptNotes}
            onChange={(e) => setPromptNotes(e.target.value)}
            placeholder="Enter clinical shorthand findings or prompt notes..."
            className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 resize-none focus:outline-none leading-relaxed"
          />

          {attachedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {attachedImages.map((img, i) => (
                <div
                  key={`${img.name}-${i}`}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#1D1D1D] border border-[#3D3D3D] text-[11px] text-slate-300"
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-4 h-4 rounded object-cover"
                  />
                  <span className="max-w-[120px] truncate">{img.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachedImages((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#444444] bg-[#2E2E2E] hover:bg-[#363636] text-xs font-medium text-slate-200 cursor-pointer transition-colors">
              <ImagePlus className="w-3.5 h-3.5 text-slate-300" />
              <span>Add Images</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleAttachImages}
                className="hidden"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedPrompt}
                onChange={(e) => setSelectedPrompt(e.target.value)}
                aria-label="Select Prompt"
                className="h-8 px-2.5 rounded-md border border-[#444444] bg-[#2C2C2C] text-xs text-slate-200 focus:outline-none focus:border-slate-400 cursor-pointer"
              >
                {PROMPT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleGenerateReport}
                className="h-8 px-3 rounded-md border border-[#4A4A4A] bg-[#333333] hover:bg-[#404040] text-xs font-medium text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* Search Templates Row */}
        <div className="relative">
          <div className="flex items-center max-w-xs h-9 px-3 rounded-md border border-[#404040] bg-[#262626]">
            <input
              type="text"
              value={templateQuery}
              onFocus={() => setShowTemplates(true)}
              onChange={(e) => {
                setTemplateQuery(e.target.value);
                setShowTemplates(true);
              }}
              placeholder="Search templates..."
              className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
            {(templateQuery || showTemplates) && (
              <button
                type="button"
                onClick={() => {
                  setTemplateQuery('');
                  setShowTemplates(false);
                }}
                className="text-slate-400 hover:text-white ml-1.5 cursor-pointer"
                aria-label="Clear template search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {showTemplates && (
            <div className="absolute left-0 mt-1 w-full max-w-sm z-20 rounded-lg border border-[#444444] bg-[#2B2B2B] shadow-xl overflow-hidden">
              {matchingTemplates.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-400">No matching templates.</p>
              ) : (
                matchingTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-[#3A3A3A] flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium">{tpl.name}</span>
                    <span className="font-mono text-[11px] text-slate-400">{tpl.modality}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Rich Text Formatting Toolbar + Structured Report Box */}
        <div className="rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] overflow-hidden">
          <div className="px-3 py-2 bg-[#2F2F2F] border-b border-[#3E3E3E] flex flex-wrap items-center gap-1.5 text-slate-300">
            <select
              value={textFormat}
              onChange={(e) => {
                setTextFormat(e.target.value);
                execCommand('formatBlock', e.target.value);
              }}
              aria-label="Text format"
              className="h-7 px-2 rounded bg-[#262626] border border-[#444444] text-xs text-slate-200 focus:outline-none cursor-pointer mr-1"
            >
              <option value="p">Normal</option>
              <option value="h3">Heading</option>
            </select>

            <button
              type="button"
              onClick={() => execCommand('bold')}
              className="p-1.5 rounded hover:bg-[#3C3C3C] text-slate-200 cursor-pointer"
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCommand('italic')}
              className="p-1.5 rounded hover:bg-[#3C3C3C] text-slate-200 cursor-pointer"
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCommand('underline')}
              className="p-1.5 rounded hover:bg-[#3C3C3C] text-slate-200 cursor-pointer"
              title="Underline"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCommand('strikeThrough')}
              className="p-1.5 rounded hover:bg-[#3C3C3C] text-slate-200 cursor-pointer"
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            <span className="h-4 w-px bg-[#444444] mx-1" aria-hidden="true" />

            <button
              type="button"
              onClick={() => execCommand('insertOrderedList')}
              className="p-1.5 rounded hover:bg-[#3C3C3C] text-slate-200 cursor-pointer"
              title="Numbered List"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCommand('insertUnorderedList')}
              className="p-1.5 rounded hover:bg-[#3C3C3C] text-slate-200 cursor-pointer"
              title="Bullet List"
            >
              <List className="w-3.5 h-3.5" />
            </button>

            <span className="h-4 w-px bg-[#444444] mx-1" aria-hidden="true" />

            <button
              type="button"
              onClick={() => execCommand('outdent')}
              className="p-1.5 rounded hover:bg-[#3C3C3C] text-slate-200 cursor-pointer"
              title="Outdent"
            >
              <Outdent className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCommand('indent')}
              className="p-1.5 rounded hover:bg-[#3C3C3C] text-slate-200 cursor-pointer"
              title="Indent"
            >
              <Indent className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCommand('justifyLeft')}
              className="p-1.5 rounded hover:bg-[#3C3C3C] text-slate-200 cursor-pointer"
              title="Align Left"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCommand('removeFormat')}
              className="p-1.5 rounded hover:bg-[#3C3C3C] text-slate-200 cursor-pointer"
              title="Clear Formatting"
            >
              <RemoveFormatting className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Structured Radiology Report Editor"
            onInput={(e) => onChange(e.currentTarget.innerText)}
            data-placeholder="Select a template, click Generate Report, or dictate structured findings..."
            className="min-h-[260px] max-h-[340px] overflow-y-auto p-4 text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-wrap focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500"
          />
        </div>

        {/* Bottom Workstation Action Bar */}
        <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-3.5 py-2 rounded-md border border-[#444444] bg-[#2E2E2E] hover:bg-[#3A3A3A] text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
            <button
              type="button"
              onClick={onSaveCase}
              disabled={saveDisabled}
              className="px-4 py-2 rounded-md border border-[#4A4A4A] bg-[#363636] hover:bg-[#444444] disabled:opacity-45 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              {saveLabel}
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onRunAiValidation}
              disabled={aiLoading}
              className="px-3.5 py-2 rounded-md border border-[#4A4A4A] bg-[#2D2D2D] hover:bg-[#3A3A3A] text-xs font-semibold text-sky-300 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {aiLoading ? 'Validating...' : 'AI Validation Check'}
            </button>
            {extraRightAction}
          </div>
        </div>
      </div>
    </div>
  );
};

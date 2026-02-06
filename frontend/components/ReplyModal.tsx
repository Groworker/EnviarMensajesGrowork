'use client';

import { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  X,
  Send,
  Sparkles,
  Loader2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  Mail,
  User,
  Building,
  MessageSquare,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface EmailResponse {
  id: number;
  subject: string;
  fromEmail: string;
  fromName?: string;
  bodyHtml?: string | null;
  bodyText?: string | null;
  classification: string;
  receivedAt: string;
}

interface ThreadData {
  originalEmail: {
    id: number;
    subjectSnapshot?: string;
    recipientEmail: string;
    client?: {
      id: number;
      nombre?: string;
      apellido?: string;
      emailOperativo?: string;
      email?: string;
    };
    jobOffer?: {
      puesto?: string;
      empresa?: string;
      hotel?: string;
    };
  };
  responses: EmailResponse[];
}

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  response: EmailResponse;
  threadData: ThreadData;
  onReplySent: () => void;
}

const classificationLabels: Record<string, { label: string; color: string }> = {
  entrevista: { label: 'Entrevista', color: 'bg-green-100 text-green-800' },
  mas_informacion: { label: 'Más información', color: 'bg-blue-100 text-blue-800' },
  negativa: { label: 'Negativa', color: 'bg-red-100 text-red-800' },
  automatica: { label: 'Automática', color: 'bg-gray-100 text-gray-800' },
  contratado: { label: 'Contratado', color: 'bg-purple-100 text-purple-800' },
  sin_clasificar: { label: 'Sin clasificar', color: 'bg-yellow-100 text-yellow-800' },
};

export default function ReplyModal({
  isOpen,
  onClose,
  response,
  threadData,
  onReplySent,
}: ReplyModalProps) {
  // Clean subject and add Re: if not present
  const cleanSubject = response.subject.startsWith('Re:')
    ? response.subject
    : `Re: ${response.subject}`;

  const [subject, setSubject] = useState(cleanSubject);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Escribe tu respuesta aquí o genera una sugerencia con IA...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none text-gray-900 prose-p:text-gray-900 prose-strong:text-gray-900 prose-li:text-gray-900',
      },
    },
  });

  const handleGenerateSuggestion = useCallback(async () => {
    if (!editor) return;

    setIsGenerating(true);
    try {
      const res = await api.post(`/email-responses/${response.id}/suggest-reply`);
      const { suggestedSubject, suggestedBody } = res.data;

      setSubject(suggestedSubject);

      // Convert plain text to HTML paragraphs
      const htmlContent = suggestedBody
        .split('\n\n')
        .filter((p: string) => p.trim())
        .map((p: string) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');

      editor.commands.setContent(htmlContent);
      toast.success('Sugerencia generada con IA');
    } catch (error: any) {
      console.error('Error generating suggestion:', error);
      toast.error(error.response?.data?.message || 'Error al generar sugerencia');
    } finally {
      setIsGenerating(false);
    }
  }, [editor, response.id]);

  const handleSendReply = useCallback(async () => {
    if (!editor) return;

    const htmlContent = editor.getHTML();
    if (!htmlContent || htmlContent === '<p></p>') {
      toast.error('Por favor, escribe un mensaje antes de enviar');
      return;
    }

    setIsSending(true);
    try {
      // Wrap the content in email HTML structure
      const client = threadData.originalEmail.client;
      const clientName = `${client?.nombre || ''} ${client?.apellido || ''}`.trim();
      const clientEmail = client?.emailOperativo || client?.email || '';

      const fullHtmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #333333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    ${htmlContent}
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eeeeee;">
      <p style="margin: 0 0 4px 0; font-weight: bold; color: #333333;">${clientName}</p>
      ${clientEmail ? `<p style="margin: 0 0 4px 0; color: #666666;">${clientEmail}</p>` : ''}
    </div>
  </div>
</body>
</html>`.trim();

      await api.post(`/email-responses/${response.id}/send-reply`, {
        subject,
        htmlContent: fullHtmlContent,
      });

      toast.success('Respuesta enviada correctamente');
      onReplySent();
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast.error(error.response?.data?.message || 'Error al enviar la respuesta');
    } finally {
      setIsSending(false);
    }
  }, [editor, response.id, subject, threadData, onReplySent]);

  if (!isOpen) return null;

  const client = threadData.originalEmail.client;
  const jobOffer = threadData.originalEmail.jobOffer;
  const classification = classificationLabels[response.classification] || classificationLabels.sin_clasificar;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Responder Email</h2>
              <p className="text-sm text-gray-500">
                A: {response.fromName || response.fromEmail}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Context Info */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap gap-4 text-sm">
            {client && (
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <span>{client.nombre} {client.apellido}</span>
              </div>
            )}
            {jobOffer && (
              <div className="flex items-center gap-2 text-gray-600">
                <Building className="w-4 h-4" />
                <span>{jobOffer.puesto} - {jobOffer.empresa || jobOffer.hotel}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-600" />
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${classification.color}`}>
                {classification.label}
              </span>
            </div>
          </div>
        </div>

        {/* Original Response Preview */}
        <div className="px-6 py-3 border-b border-gray-200 bg-blue-50/50">
          <p className="text-xs font-medium text-gray-500 mb-1">Respuesta recibida:</p>
          <p className="text-sm text-gray-700 line-clamp-2">
            {response.bodyText || 'Sin contenido de texto'}
          </p>
        </div>

        {/* Subject Field */}
        <div className="px-6 py-3 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Asunto
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Editor Toolbar */}
        {editor && (
          <div className="px-6 py-2 border-b border-gray-200 flex items-center gap-1 flex-wrap">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-100 ${
                editor.isActive('bold') ? 'bg-gray-200' : ''
              }`}
              title="Negrita"
            >
              <Bold className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-100 ${
                editor.isActive('italic') ? 'bg-gray-200' : ''
              }`}
              title="Cursiva"
            >
              <Italic className="w-4 h-4 text-gray-700" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-gray-100 ${
                editor.isActive('bulletList') ? 'bg-gray-200' : ''
              }`}
              title="Lista"
            >
              <List className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded hover:bg-gray-100 ${
                editor.isActive('orderedList') ? 'bg-gray-200' : ''
              }`}
              title="Lista numerada"
            >
              <ListOrdered className="w-4 h-4 text-gray-700" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
              title="Deshacer"
            >
              <Undo className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
              title="Rehacer"
            >
              <Redo className="w-4 h-4 text-gray-700" />
            </button>

            <div className="flex-1" />

            <button
              onClick={handleGenerateSuggestion}
              disabled={isGenerating}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isGenerating ? 'Generando...' : 'Generar con IA'}
            </button>
          </div>
        )}

        {/* Editor Content */}
        <div className="flex-1 overflow-auto px-6 py-2">
          <div className="border border-gray-300 rounded-lg min-h-[200px] bg-white">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Se enviará desde: <span className="font-medium">{client?.emailOperativo || client?.email || 'No configurado'}</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSendReply}
              disabled={isSending || !editor?.getText().trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title={!editor?.getText().trim() ? 'Escribe un mensaje antes de enviar' : ''}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isSending ? 'Enviando...' : 'Enviar Respuesta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

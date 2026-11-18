import React from 'react';
import { useApp } from '../context/AppContext';
import { CustomRequestModal } from './CustomRequestModal';
import { FormBuilderModal } from './FormBuilderModal';
import { ItRequestModal } from './ItRequestModal';
import { MemoRequestModal } from './MemoRequestModal';
import { PoRequestModal } from './PoRequestModal';

/** The form being filled in, or the form builder, opened from the แบบฟอร์ม menu. */
export const FormModals: React.FC = () => {
  const { menuPermissions, fillingFormId, setFillingFormId, formBuilder, setFormBuilder } = useApp();
  const form = fillingFormId ? menuPermissions.find(f => f.id === fillingFormId) : undefined;
  const close = () => setFillingFormId(null);

  return (
    <>
      {form &&
        (form.template === 'memo' ? (
          <MemoRequestModal form={form} onClose={close} />
        ) : form.template === 'it_request' ? (
          <ItRequestModal form={form} onClose={close} />
        ) : form.template === 'po_request' ? (
          <PoRequestModal form={form} onClose={close} />
        ) : (
          <CustomRequestModal form={form} onClose={close} />
        ))}
      {formBuilder && (
        <FormBuilderModal deptId={formBuilder.deptId} form={formBuilder.form} onClose={() => setFormBuilder(null)} />
      )}
    </>
  );
};

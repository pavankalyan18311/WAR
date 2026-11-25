import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import AttributeSelect from '@/components/admin/AttributeSelect';

const options = [{ id: '1', value: '100% Cotton' }, { id: '2', value: 'Cotton Blend' }];

function Harness({ initial = '', onValue }: { initial?: string; onValue?: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return <AttributeSelect label="Fabric" options={options} value={value} onChange={(v) => { setValue(v); onValue?.(v); }} />;
}

describe('AttributeSelect', () => {
  it('lets the admin pick a saved option', () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    fireEvent.change(screen.getByLabelText('Fabric'), { target: { value: 'Cotton Blend' } });
    expect(onValue).toHaveBeenLastCalledWith('Cotton Blend');
    expect(screen.queryByLabelText('Fabric (type your own)')).not.toBeInTheDocument();
  });

  it('shows a text box only when "Other…" is chosen', () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    fireEvent.change(screen.getByLabelText('Fabric'), { target: { value: '__other__' } });
    fireEvent.change(screen.getByLabelText('Fabric (type your own)'), { target: { value: 'Bamboo Cotton' } });
    expect(onValue).toHaveBeenLastCalledWith('Bamboo Cotton');
  });

  it('when editing, a value that is not in the list is shown as "Other" with its text', () => {
    render(<Harness initial="Khadi" />);
    expect(screen.getByLabelText<HTMLSelectElement>('Fabric').value).toBe('__other__');
    expect(screen.getByLabelText<HTMLInputElement>('Fabric (type your own)').value).toBe('Khadi');
  });

  it('can be left empty', () => {
    const onValue = vi.fn();
    render(<Harness initial="100% Cotton" onValue={onValue} />);
    fireEvent.change(screen.getByLabelText('Fabric'), { target: { value: '' } });
    expect(onValue).toHaveBeenLastCalledWith('');
  });
});

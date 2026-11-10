import { useCallback, useState } from 'react';
import type { FarmFormRecord } from '@/database/tables/FarmFormTable';
import { EMPTY_FARM_FORM_VALUES, type FarmFormValues } from '@/components/farm/FarmFormFields';

// Estado compartido de los campos del formulario de la finca.
// Lo usan el modal inicial y la pestaña Usuario; cada contenedor
// conserva su propio ciclo de vida (reset, snapshot, guardado).
export function useFarmFormState(initial: FarmFormValues = EMPTY_FARM_FORM_VALUES) {
  const [values, setValues] = useState<FarmFormValues>(initial);

  const patch = useCallback((p: Partial<FarmFormValues>) => {
    setValues(prev => ({ ...prev, ...p }));
  }, []);

  const applyRecord = useCallback((form: FarmFormRecord | null) => {
    setValues({
      nombreFinca: form?.nombre_finca ?? "",
      hectareas: form?.hectareas != null ? String(form.hectareas) : "",
      departamento: form?.departamento ?? null,
      municipio: form?.municipio ?? null,
      vereda: form?.vereda ?? "",
      // SQLite devuelve 0/1; null = nunca se preguntó.
      autorizaUsoMuestras: form?.autoriza_uso_muestras == null ? null : !!form.autoriza_uso_muestras,
    });
  }, []);

  const reset = useCallback(() => {
    setValues(EMPTY_FARM_FORM_VALUES);
  }, []);

  return { values, patch, setValues, applyRecord, reset };
}

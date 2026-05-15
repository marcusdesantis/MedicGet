/**
 * useRefetchOnFocus — refresca data cuando la pantalla recobra el foco.
 *
 * Por qué hace falta:
 *   expo-router conserva las tabs montadas para que el switch sea
 *   instantáneo. La consecuencia es que `useApi` solo dispara su fetch
 *   en el primer mount — si el usuario crea/cancela/edita algo desde
 *   otra pantalla y vuelve a la tab, vería data vieja porque
 *   `useEffect([...deps])` no se re-ejecuta.
 *
 *   Este hook usa `useFocusEffect` de react-navigation (que expo-router
 *   reexporta) para dispararle un `refetch` al fetcher cada vez que la
 *   pantalla vuelve a tener foco. Saltea el primer foco (que coincide
 *   con el mount inicial, donde `useApi` ya hace su fetch) para evitar
 *   pedir el mismo recurso dos veces de entrada.
 */

import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

export function useRefetchOnFocus(refetch: () => void): void {
  const skipFirst = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (skipFirst.current) {
        skipFirst.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );
}

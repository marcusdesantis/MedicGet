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
 *
 * Estabilidad:
 *   Mantenemos `refetch` en una ref para que la callback de
 *   `useFocusEffect` tenga identidad estable. Si el caller pasa un
 *   `refetch` no-memoizado (que cambia en cada render), igual
 *   funcionamos sin loopear — la callback no se invalida.
 */

import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

export function useRefetchOnFocus(refetch: () => void): void {
  const skipFirst = useRef(true);
  // Mantenemos el último `refetch` en una ref. Así la callback que le
  // pasamos a `useFocusEffect` no depende de `refetch` y nunca se
  // invalida — invocamos al refetch vigente a través de la ref.
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useFocusEffect(
    useCallback(() => {
      if (skipFirst.current) {
        skipFirst.current = false;
        return;
      }
      refetchRef.current();
    }, []),
  );
}

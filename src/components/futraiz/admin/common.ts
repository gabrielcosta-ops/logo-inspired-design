import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { futraizQuery } from "@/lib/futraiz/data";

/** Runs an admin write, shows errors as a toast and refreshes the shared data. */
export function useAdminRun() {
  const qc = useQueryClient();
  return useCallback(
    async <T,>(fn: () => PromiseLike<{ error: { message: string } | null; data?: T }>, ok?: string) => {
      const res = await fn();
      if (res.error) {
        toast.error(res.error.message);
        return false;
      }
      if (ok) toast.success(ok);
      await qc.invalidateQueries({ queryKey: futraizQuery.queryKey });
      return true;
    },
    [qc],
  );
}

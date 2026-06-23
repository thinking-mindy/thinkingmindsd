"use client";

import { useCallback, useEffect, useState } from "react";
import { getReceiptDesignForCurrentOrg } from "@/lib/desktop/receipt-bridge";
import {
  buildReceiptDesignConfig,
  type ReceiptDesignConfig,
} from "@/lib/receipt-settings";

export function useReceiptDesign() {
  const [config, setConfig] = useState<ReceiptDesignConfig>(() => buildReceiptDesignConfig({}));
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReceiptDesignForCurrentOrg();
      if (data) setConfig(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { config, loading, reload };
}

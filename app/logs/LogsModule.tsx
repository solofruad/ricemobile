import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ApiRequestLogsTable, { ApiLogRecord, LogSource } from "@/database/tables/ApiRequestLogsTable";
import { shareLogsDump } from "@/services/log-dump";

type SourceFilter = "all" | LogSource;

const FILTERS: Array<{ key: SourceFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "riceback", label: "Riceback" },
  { key: "llm", label: "LLM" },
];

function statusStyle(status: number | null): { backgroundColor: string; color: string } {
  if (status === null) return { backgroundColor: "#e2e8f0", color: "#475569" };
  if (status >= 200 && status < 300) return { backgroundColor: "#dff0e2", color: "#1e7e34" };
  if (status >= 400 && status < 500) return { backgroundColor: "#ffedd5", color: "#b26a00" };
  if (status >= 500) return { backgroundColor: "#ffdad6", color: "#b3261e" };
  return { backgroundColor: "#e2e8f0", color: "#475569" };
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} selectable>
        {value}
      </Text>
    </View>
  );
}

function DetailBody({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.bodyBox}>
        <Text style={styles.bodyText} selectable>
          {value ?? "—"}
        </Text>
      </View>
    </View>
  );
}

export default function LogsModule() {
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<Array<ApiLogRecord>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [selected, setSelected] = useState<ApiLogRecord | null>(null);
  const [exporting, setExporting] = useState(false);
  const [dumpError, setDumpError] = useState<string | null>(null);

  const loadLogs = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const rows = await ApiRequestLogsTable.getAllNewestFirst();
      setLogs(rows);
    } catch (err) {
      console.log("Error leyendo logs de peticiones", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [loadLogs]),
  );

  const filtered = useMemo(() => {
    if (filter === "all") return logs;
    return logs.filter(log => log.source === filter);
  }, [logs, filter]);

  const handleShareDump = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    setDumpError(null);
    try {
      await shareLogsDump();
    } catch (err) {
      setDumpError(err instanceof Error ? err.message : "No se pudo compartir el dump.");
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  const renderItem = ({ item }: { item: ApiLogRecord }) => {
    const badge = statusStyle(item.status_code);
    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.7}>
        <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>
            {item.status_code !== null ? String(item.status_code) : "ERR"}
          </Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.url} numberOfLines={1} ellipsizeMode="middle">
            {item.url}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {item.method} · {item.created_at} · {item.source === "riceback" ? "Riceback" : "LLM"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Logs de peticiones</Text>
      <Text style={styles.subtitle}>
        {filtered.length} registros · el más nuevo primero
      </Text>

      <View style={styles.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.dumpRow}>
        <TouchableOpacity
          style={[styles.dumpButton, (exporting || logs.length === 0) && styles.dumpButtonDisabled]}
          onPress={handleShareDump}
          disabled={exporting || logs.length === 0}
        >
          <Text style={styles.dumpButtonText}>
            {exporting ? "Generando dump..." : "Compartir dump (.json)"}
          </Text>
        </TouchableOpacity>
      </View>
      {dumpError && <Text style={styles.dumpError}>{dumpError}</Text>}

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Cargando logs...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <IconButton icon="text-box-outline" size={64} iconColor="#8a94a6" />
          <Text style={styles.emptyText}>No hay peticiones registradas</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadLogs(true)} />
          }
        />
      )}

      <Modal
        animationType="fade"
        transparent
        visible={selected !== null}
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Detalle de la petición</Text>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
              {selected && (
                <>
                  <DetailRow label="Método" value={selected.method} />
                  <DetailRow label="URL" value={selected.url} />
                  <DetailRow label="Fecha y hora" value={selected.created_at} />
                  <DetailRow
                    label="Origen"
                    value={selected.source === "riceback" ? "Riceback" : "LLM local"}
                  />
                  <DetailRow
                    label="Status"
                    value={selected.status_code !== null ? String(selected.status_code) : "Sin respuesta (error de red)"}
                  />
                  <DetailBody label="Cuerpo de la petición" value={selected.request_body} />
                  <DetailBody label="Respuesta del backend" value={selected.response_body} />
                  {selected.error && <DetailBody label="Error" value={selected.error} />}
                </>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelected(null)}>
              <Text style={styles.closeText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121222ff",
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 12,
  },
  subtitle: {
    color: "#8a94a6",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  filters: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#1e1e33",
    borderWidth: 1,
    borderColor: "#33334d",
  },
  chipActive: {
    backgroundColor: "white",
    borderColor: "white",
  },
  chipText: {
    color: "#8a94a6",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#121222ff",
  },
  dumpRow: {
    alignItems: "center",
    marginBottom: 4,
  },
  dumpButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#2e7d32",
  },
  dumpButtonDisabled: {
    opacity: 0.4,
  },
  dumpButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  dumpError: {
    color: "#ff8a80",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 4,
  },
  list: {
    padding: 12,
    paddingBottom: 24,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  badge: {
    minWidth: 52,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  url: {
    fontSize: 13,
    fontFamily: "monospace",
    color: "#1a1a2e",
  },
  meta: {
    fontSize: 11,
    color: "#5A6C7D",
    marginTop: 2,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "white",
    fontSize: 16,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 20,
  },
  modalView: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    color: "#1a1a2e",
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalContent: {
    paddingBottom: 8,
  },
  detailRow: {
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#5A6C7D",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: "#1a1a2e",
  },
  bodyBox: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 8,
    maxHeight: 220,
  },
  bodyText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#1a1a2e",
  },
  closeButton: {
    marginTop: 12,
    backgroundColor: "#121222ff",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  closeText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
});

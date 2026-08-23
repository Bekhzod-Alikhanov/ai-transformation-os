import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";

import { opportunities, pilots } from "@/modules/demo/aster-data";
import { formatCompactCurrency } from "@/lib/utils";

const styles = StyleSheet.create({
  page: {
    padding: 46,
    backgroundColor: "#f3f2ec",
    color: "#20221e",
    fontFamily: "Helvetica",
    fontSize: 9,
  },
  eyebrow: {
    fontSize: 7,
    letterSpacing: 1.5,
    color: "#6d7067",
    marginBottom: 8,
  },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  subtitle: {
    fontSize: 10,
    color: "#6d7067",
    lineHeight: 1.5,
    marginBottom: 24,
  },
  metrics: { display: "flex", flexDirection: "row", marginBottom: 22 },
  metric: {
    flex: 1,
    backgroundColor: "#ffffff",
    border: "1 solid #dedfd9",
    padding: 13,
  },
  metricLabel: { fontSize: 6, color: "#6d7067", letterSpacing: 1 },
  metricValue: { fontSize: 18, fontWeight: 700, marginTop: 8 },
  section: {
    backgroundColor: "#ffffff",
    border: "1 solid #dedfd9",
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 10 },
  row: {
    display: "flex",
    flexDirection: "row",
    borderTop: "1 solid #e7e8e2",
    paddingVertical: 8,
  },
  rowTitle: { width: "48%", fontWeight: 700 },
  rowValue: { width: "18%", textAlign: "right" },
  rowDetail: { width: "34%", textAlign: "right", color: "#6d7067" },
  condition: {
    backgroundColor: "#fffaf0",
    border: "1 solid #ead9ae",
    padding: 14,
    marginBottom: 14,
  },
  body: { lineHeight: 1.5, color: "#565950" },
  footer: {
    position: "absolute",
    left: 46,
    right: 46,
    bottom: 28,
    borderTop: "1 solid #dedfd9",
    paddingTop: 8,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6,
    color: "#85887f",
    letterSpacing: 0.8,
  },
});

function Brief() {
  const hero = opportunities[0]!;
  return (
    <Document
      title="Aster AI Transformation Brief"
      author="Aster AI Transformation OS"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>
          ASTER FINANCIAL GROUP · SYNTHETIC REPLAY
        </Text>
        <Text style={styles.title}>AI transformation decision brief</Text>
        <Text style={styles.subtitle}>
          Evidence-backed portfolio snapshot · 22 August 2026 · All example
          source content and identities are synthetic.
        </Text>
        <View style={styles.metrics}>
          {[
            ["VALUE AT STAKE", "$8.4M"],
            ["REALISED RUN-RATE", "$1.9M"],
            ["ACTIVE INITIATIVES", "12"],
            ["DECISIONS", "4"],
          ].map(([label, value]) => (
            <View style={styles.metric} key={label}>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text style={styles.metricValue}>{value}</Text>
            </View>
          ))}
        </View>
        <View style={styles.condition}>
          <Text style={styles.eyebrow}>
            RECOMMENDED DECISION · CONDITIONAL GO
          </Text>
          <Text style={styles.sectionTitle}>{hero.title}</Text>
          <Text style={styles.body}>
            Proceed to a controlled 90-day proof of value. Verify source
            entitlements, demonstrate at least 65% adoption, measure
            redeployable capacity, and retain human approval before publication.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Priority opportunity slate</Text>
          {opportunities.slice(0, 6).map((item) => (
            <View style={styles.row} key={item.id}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowValue}>
                {formatCompactCurrency(item.annualValue)}
              </Text>
              <Text style={styles.rowDetail}>
                {item.score} score · {Math.round(item.evidenceCoverage * 100)}%
                evidence
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pilot value</Text>
          {pilots.map((pilot) => (
            <View style={styles.row} key={pilot.id}>
              <Text style={styles.rowTitle}>{pilot.name}</Text>
              <Text style={styles.rowValue}>
                {formatCompactCurrency(pilot.realisedRunRate)}
              </Text>
              <Text style={styles.rowDetail}>
                {Math.round(pilot.actualAdoption * 100)}% adoption
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.footer}>
          <Text>AI TRANSFORMATION OS · EVIDENCE SNAPSHOT</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export function generateDecisionBrief() {
  return renderToBuffer(<Brief />);
}

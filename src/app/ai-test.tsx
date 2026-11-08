import { useState } from "react";
import { ActivityIndicator, Button, ScrollView, Text, TextInput, View } from "react-native";
import { parseIngredients, type ParsedFood } from "../lib/ai";

// TEMPORARY test screen: delete before merging
export default function AITest() {
  const [text, setText] = useState("2 eggs, 5 grapes, 1 slice toast with butter");
  const [items, setItems] = useState<ParsedFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");
    setItems([]);
    try {
      setItems(await parseIngredients(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const total = items.reduce((sum, i) => sum + (i.found ? i.kcal : 0), 0);

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>AI test</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, minHeight: 80 }}
      />
      <Button title={loading ? "Estimating..." : "Calculate"} onPress={run} disabled={loading} />
      {loading && <ActivityIndicator />}
      {!!error && <Text style={{ color: "red" }}>{error}</Text>}

      {items.map((item, idx) => (
        <View key={idx} style={{ borderBottomWidth: 1, borderColor: "#eee", paddingVertical: 8 }}>
          <Text style={{ fontWeight: "600" }}>
            {item.name} · {item.grams} g
          </Text>
          {item.found ? (
            <Text>
              {item.kcal} kcal · P {item.protein} · C {item.carbs} · F {item.fat}
            </Text>
          ) : (
            <Text style={{ color: "orange" }}>Not found, would ask user to enter manually</Text>
          )}
        </View>
      ))}

      {items.length > 0 && <Text style={{ fontWeight: "600" }}>Total: {total} kcal</Text>}
    </ScrollView>
  );
}
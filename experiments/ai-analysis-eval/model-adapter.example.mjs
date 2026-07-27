/**
 * 供应商无关的模型接口示例。
 *
 * 正式适配器必须放在独立、未提交密钥的本地环境中，并返回满足
 * schema/analysis-result.schema.json 的纯 JSON。实验台本身不读取环境密钥。
 */
export async function analyze({ photoPath, context, schema, modelConfig }) {
  void photoPath;
  void context;
  void schema;
  void modelConfig;
  throw new Error(
    "尚未配置模型适配器。请实现 analyze(photoPath, context, schema)，再把结果 JSON 导入实验页。",
  );
}

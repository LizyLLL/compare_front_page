import type { EvalDataset } from "@/utils/dataset"

export const SAMPLE_DATASET: EvalDataset = {
  datasetId: "sample",
  datasetName: "示例数据",
  sourceName: "内置示例",
  items: [
    {
      id: "sample_1",
      question: "帮我根据今天的天气给出通勤与运动建议。",
      userStatus: { location: "Boston:Home", time: "2024-09-06 07:15:00" },
      userProfile: "{name: 'Emily Smith', occupation: 'Physician (Cardiologist)'}",
      answers: {
        gpt_4o: "今天可能有雾且降雨概率高，建议携带雨具并预留更多通勤时间；运动可改为室内。",
        skillrl: "雾，21.8/15.1℃，降雨概率100%。带雨具，注意能见度。",
        our_method: "雾天+高降雨概率，建议防水外套、提前出门；今晚跑步改为室内训练，并把园艺活动延期。",
        claude_sonnet_4_6: "今天波士顿雾天且很可能下雨，带伞、减速驾驶；晚间散步可改室内瑜伽。",
      },
    },
  ],
}


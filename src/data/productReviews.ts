import { ProductReview } from '../types/store';

export const initialReviews: ProductReview[] = [
  {
    id: "rev-1",
    productId: "prod-ort-104",
    author: "Микола Дмитрович",
    city: "с-ще. Оратів",
    rating: 5,
    date: "Вчора",
    comment: "Встановив змішувач на кухні вдома. Латунь важка, хід важеля плавний і безшумний, ніде не капає. Якість відмінна!",
    verifiedPurchase: true,
    recommended: true,
    helpfulCount: 7
  },
  {
    id: "rev-2",
    productId: "prod-vvg-315",
    author: "Віктор (Електрик)",
    city: "Вінницька обл.",
    rating: 5,
    date: "2 дні тому",
    comment: "Перевіряв штангенциркулем — переріз та опір чесні згідно з ДСТУ, чиста мідь 100%. Ізоляція не горить і зручно зачищається.",
    verifiedPurchase: true,
    recommended: true,
    helpfulCount: 8
  },
  {
    id: "rev-3",
    productId: "prod-avt-16",
    author: "Дмитро П.",
    city: "с-ще. Оратів",
    rating: 5,
    date: "4 дні тому",
    comment: "Модульний автомат Schneider працює бездоганно. Надійні клеми під гребінку, чітке спрацьовування. Дякую магазину за пораду.",
    verifiedPurchase: true,
    recommended: true,
    helpfulCount: 4
  },
  {
    id: "rev-4",
    productId: "prod-grohe-33300",
    author: "Сергій В.",
    city: "Липовець",
    rating: 5,
    date: "5 днів тому",
    comment: "Оригінальний німецький Grohe! Плавний хід картриджа SilkMove, хром блищить і не тьмяніє від вапняної води.",
    verifiedPurchase: true,
    recommended: true,
    helpfulCount: 5
  },
  {
    id: "rev-5",
    productId: "prod-wavin-pipe-20",
    author: "Тарас",
    city: "Погребище",
    rating: 5,
    date: "Тиждень тому",
    comment: "Труба Wavin з базальтовим волокном легко паяється, не розширюється при гарячій воді. Брав на всю систему опалення.",
    verifiedPurchase: true,
    recommended: true,
    helpfulCount: 6
  },
  {
    id: "rev-6",
    productId: "",
    author: "Олександр М.",
    city: "с-ще. Оратів",
    rating: 5,
    date: "Тиждень тому",
    comment: "Замовляв з самовивозом у магазині в с-ще. Оратів. Товар якісний, оригінал, ціна краща ніж у місті. Рекомендую ISKRA!",
    verifiedPurchase: true,
    recommended: true,
    helpfulCount: 9
  }
];

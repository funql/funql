import { Bson, Database, Filter, FindOptions } from "../../deps.ts";

import { throwError } from "../../utils/mod.ts";

let count = 0;

export const collectData = async (
  schemas: any,
  filter: Filter<Bson.Document>,
  db: Database,
  projection: any,
  collection: string,
  result: any = {},
  type: "one" | "many",
  options?: FindOptions,
) => {
  // count++;
  // console.log("===========================================>");
  // console.log("count=======>", count);
  // console.log("collection================>", collection);
  // console.log("in findOne");
  // console.log("==================>projection", projection);
  // console.log("=================> filter", filter);
  // console.log("===========================================>");

  result = type === "one"
    ? db
      ? await db.collection(collection).findOne(filter, {
        ...options,
        projection,
      })
      : throwError("No database connection")
    : db
    ? await db.collection(collection).find({ _id: { $in: filter } }, {
      ...options,
      projection,
    }).toArray()
    : throwError("No database connection");

  // console.log("===========================================>");
  // console.log("in findOne function");
  // console.log("==================>result", result);
  // console.log("===========================================>");

  for (let key in projection) {
    if (
      Object.keys(schemas[collection]["inrelation"]).includes(key) &&
      schemas[collection]["inrelation"][key]["type"] === "many"
    ) {
      if (
        !Array.isArray(result) &&
        Object.keys(projection[key]).length !==
          Object.keys(result[key][0]).length
      ) {
        filter = result[key].map((value: any) => value._id);

        result[key] = await collectData(
          schemas,
          filter,
          db,
          projection[key],
          schemas[collection]["inrelation"][key]["schemaName"],
          {},
          "many",
        );
      } else if (
        Array.isArray(result) &&
        Object.keys(projection[key]).length !==
          Object.keys(result[0][key]).length
      ) {
        for (const item of result) {
          filter = item[key].map((value: any) => value._id);

          item[key] = await collectData(
            schemas,
            filter,
            db,
            projection[key],
            schemas[collection]["inrelation"][key]["schemaName"],
            {},
            "many",
          );
        }
      }
    } else if (
      Object.keys(schemas[collection]["inrelation"]).includes(key) &&
      schemas[collection]["inrelation"][key]["type"] === "one"
    ) {
      if (
        !Array.isArray(result) &&
        Object.keys(projection[key]).length !==
          Object.keys(result[key]).length
      ) {
        filter = { _id: result[key]._id };

        result[key] = await collectData(
          schemas,
          filter,
          db,
          projection[key],
          schemas[collection]["inrelation"][key]["schemaName"],
          {},
          "one",
        );
      } else if (
        Array.isArray(result) &&
        Object.keys(projection[key]).length !==
          Object.keys(result[0][key]).length
      ) {
        for (const item of result) {
          filter = { _id: item[key]._id };

          item[key] = await collectData(
            schemas,
            filter,
            db,
            projection[key],
            schemas[collection]["inrelation"][key]["schemaName"],
            {},
            "one",
          );
        }
      }
    } else if (
      Object.keys(schemas[collection]["outrelation"]).includes(key)
    ) {
      if (
        (result instanceof Object && !(result instanceof Array)) &&
        Object.keys(projection[key]).length !==
          Object.keys(result[key][0]).length
      ) {
        filter = result[key].map((value: any) => value._id);

        result[key] = await collectData(
          schemas,
          filter,
          db,
          projection[key],
          schemas[collection]["outrelation"][key]["schemaName"],
          {},
          "many",
        );
      } else if (
        Array.isArray(result) &&
        Object.keys(projection).length !==
          Object.keys(result[0][key]).length
      ) {
        for (const item of result) {
          filter = item[key].map((value: any) => value._id);

          item[key] = await collectData(
            schemas,
            filter,
            db,
            projection[key],
            schemas[collection]["outrelation"][key]["schemaName"],
            {},
            "many",
          );
        }
      }
    }
  }

  return result;
};

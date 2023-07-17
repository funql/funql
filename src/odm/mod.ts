import {
  AggregateOptions,
  AggregatePipeline,
  Bson,
  Database,
  DeleteOptions,
  Filter,
  FindOptions,
  InsertDocument,
  InsertOptions,
  ObjectId,
  UpdateFilter,
  UpdateOptions,
} from "../deps.ts";
import { InRelation, ISchema, OutRelation, PureModel } from "../models/mod.ts";
import { schemaFns } from "../models/mod.ts";
import { assert, create, enums, object, optional } from "../npmDeps.ts";
import { throwError } from "../utils/throwError.ts";
import { generateProjection, Projection } from "./aggregation/mod.ts";
import {
  addOutrelation,
  checkRelation,
  collectData,
  makeProjection,
  objectIdValidation,
} from "./utils/mod.ts";

export const odm = (schemasObj: ISchema) => {
  let mongoDb: Database;

  const setDb = (db: Database) => (mongoDb = db);

  const getDbClient = () => mongoDb;

  const getCollection = (collection: string) => {
    const db = getDbClient();
    const getSchemas = enums(schemaFns(schemasObj).getSchemasKeys());
    assert(collection, getSchemas);
    return db
      ? db.collection(collection)
      : throwError("No database connection");
  };

  // findData now work
  const findData = async (
    collection: string,
    filter: Filter<Bson.Document>,
    get: Projection,
    options?: FindOptions,
  ) => {
    const db = getDbClient();
    const getSchemas = enums(schemaFns(schemasObj).getSchemasKeys());
    const schemas = schemaFns(schemasObj).getSchemas();
    assert(collection, getSchemas);

    const projection = makeProjection(collection, {}, get, schemas);

    const result = await collectData(
      schemas,
      filter,
      db,
      projection,
      collection,
      {},
      "many",
      options,
    );
    return result;
  };

  const findOneData = async (
    collection: string,
    filter: Filter<Bson.Document>,
    get: Projection,
    options?: FindOptions,
  ) => {
    const db = getDbClient();
    const getSchemas = enums(schemaFns(schemasObj).getSchemasKeys());
    const schemas = schemaFns(schemasObj).getSchemas();
    assert(collection, getSchemas);

    const projection = makeProjection(collection, {}, get, schemas);

    const result = await collectData(
      schemas,
      filter,
      db,
      projection,
      collection,
      {},
      "one",
      options,
    );
    return result;
  };

  const findOnePureData = async (
    collection: string,
    filter: Filter<Bson.Document>,
    options?: FindOptions,
  ) => {
    const projection: Projection = {};
    const PureSchema = schemaFns(schemasObj).getSchema(collection).pure;

    for (const key in PureSchema) {
      projection[key] = 1;
    }

    return await findOneData(collection, filter, projection, options);
  };

  const findPureData = async (
    collection: string,
    filter: Filter<Bson.Document>,
    options?: FindOptions,
  ) => {
    const projection: Projection = {};
    const PureSchema = schemaFns(schemasObj).getSchema(collection).pure;

    for (const key in PureSchema) {
      projection[key] = 1;
    }

    return await findData(collection, filter, projection, options);
  };

  const insertOneData = async ({
    collection,
    doc,
    relation,
    options,
    get,
  }: {
    collection: string;
    doc: InsertDocument<Bson.Document>;
    relation?: Record<string, ObjectId | ObjectId[]>;
    options?: InsertOptions;
    get?: Projection;
  }) => {
    const db = getDbClient();
    const pureInrelSchema = schemaFns(schemasObj).getPureInRel(collection);
    const foundedSchema = schemaFns(schemasObj).getSchema(collection);
    const inrelationObj =
      schemaFns(schemasObj).getSchema(collection).inrelation;

    const checkRelationTypeAndAddInRelation = async (key: string) => {
      if (!Array.isArray(relation![key])) {
        const res = await findOnePureData(inrelationObj[key].schemaName, {
          _id: relation![key],
        });
        /*
         *  @LOG @DEBUG @INFO
         *  This log written by ::==> {{ syd }}
         *
         *  Please remove your log after debugging
         */
        console.log(" ============= ");
        console.group("res ------ ");
        console.log();
        console.info({
          res,
          relation: relation![key],
          collection: inrelationObj[key].schemaName,
        }, " ------ ");
        console.log();
        console.groupEnd();
        console.log(" ============= ");
        doc[key] = res;
      } else {
        const res = await findPureData(inrelationObj[key].schemaName, {
          _id: { $in: relation![key] },
        });
        doc[key] = res;
      }
    };

    // console.log("doc================>", doc);
    if (relation) {
      for (const key in inrelationObj) {
        if (inrelationObj[key].optional === false) {
          await checkRelationTypeAndAddInRelation(key);
        } else {
          /*
           *  @LOG @DEBUG @INFO
           *  This log written by ::==> {{ syd }}
           *
           *  Please remove your log after debugging
           */
          console.log(" ============= ");
          console.group("relation, optopnal:  ------ ");
          console.log();
          console.info({
            relation,
            inrelationObj,
            optional: relation[inrelationObj[key].schemaName],
            keyname: inrelationObj[key].schemaName,
            key,
            newOptinal: relation[key],
          }, " ------ ");
          console.log();
          console.groupEnd();
          console.log(" ============= ");
          if (
            key &&
            relation[key]
          ) {
            await checkRelationTypeAndAddInRelation(key);
          }
        }
      }
    }

    create(doc, object(pureInrelSchema));

    doc = addOutrelation(collection, doc, foundedSchema);

    /*
     *  @LOG @DEBUG @INFO
     *  This log written by ::==> {{ syd }}
     *
     *  Please remove your log after debugging
     */
    console.log(" ============= ");
    console.group("doc ------ ");
    console.log();
    console.info({ doc }, " ------ ");
    console.log();
    console.groupEnd();
    console.log(" ============= ");

    doc._id = db
      ? await db.collection(collection).insertOne(doc, options)
      : throwError("No database connection");

    // console.log(result);

    checkRelation(collection, inrelationObj, schemasObj, doc, db);

    const getAggregation = async () =>
      await aggregationData({
        collection,
        pipline: [{ $match: { _id: doc._id } }],
        get,
      });

    return get ? await getAggregation() : doc._id;
  };

  const updateOneData = async (
    collection: string,
    filter: Filter<Bson.Document>,
    update: UpdateFilter<Bson.Document>,
    options?: UpdateOptions,
  ) => {
    const db = getDbClient();
    return db
      ? await db.collection(collection).updateOne(filter, update, options)
      : throwError("No database connection");
  };

  const updateByIdData = async ({
    collection,
    _id,
    update,
    options,
    get,
  }: {
    collection: string;
    _id: string | ObjectId;
    update: UpdateFilter<Bson.Document>;
    options?: UpdateOptions;
    get?: Projection;
  }) => {
    const db = getDbClient();

    const getAggregation = async () =>
      await aggregationData({
        collection,
        pipline: [{ $match: { _id } }],
        get,
      });

    const updatedData = await db.collection(collection).updateOne(
      { _id },
      update,
      options,
    );

    return db
      ? get
        ? await getAggregation()
        : updatedData
      : throwError("No database connection");
  };

  const deleteData = async (
    collection: string,
    query: Bson.Document,
    options?: DeleteOptions,
  ) => {
    const db = getDbClient();
    return db
      ? await db.collection(collection).delete(query, options)
      : throwError("No database connection");
  };

  const deleteByIdData = async ({
    collection,
    _id,
    options,
    get,
  }: {
    collection: string;
    _id: ObjectId | string;
    options?: DeleteOptions;
    get?: Projection;
  }) => {
    const db = getDbClient();

    const getAggregation = async () =>
      await aggregationData({
        collection,
        pipline: [{ $match: { _id } }],
        get,
      });

    const deletedData = await db.collection(collection).deleteOne(
      { _id },
      options,
    );

    return db
      ? get
        ? await getAggregation()
        : deletedData
      : throwError("No database connection");
  };

  const aggregationData = async (
    {
      collection,
      pipline,
      options,
      get,
    }: {
      collection: string;
      pipline: AggregatePipeline<Bson.Document>[];
      options?: AggregateOptions | undefined;
      get?: Projection;
    },
  ) => {
    const db = getDbClient();
    const projection = get
      ? generateProjection(get, schemasObj, collection)
      : [];
    pipline = [...pipline, ...projection];

    return db
      ? await db.collection(collection).aggregate(pipline, options).toArray()
      : throwError("No database connection");
  };

  const setModel = (
    name: string,
    pureModel: PureModel,
    inrelation: Record<string, InRelation>,
    outrelation: Record<string, OutRelation>,
  ) => {
    const schemas = schemaFns(schemasObj).getSchemas();

    pureModel = pureModel._id
      ? pureModel
      : {
        _id: optional(objectIdValidation),
        ...pureModel,
      };

    schemas[name] = {
      pure: pureModel,
      inrelation: inrelation,
      outrelation: outrelation,
    };

    return {
      find: (query: Bson.Document, projection: Projection) =>
        findData(name, query, projection),

      findOne: (
        filter: Filter<Bson.Document>,
        get: Projection,
        options?: FindOptions,
      ) => findOneData(name, filter, get, options),

      insertOne: (
        { doc, relation, options, get }: {
          doc: InsertDocument<Bson.Document>;
          relation?: Record<string, ObjectId | ObjectId[]>;
          options?: InsertOptions;
          get: Projection;
        },
      ) => insertOneData({ collection: name, doc, relation, options, get }),

      updateOne: (
        filter: Filter<Bson.Document>,
        update: UpdateFilter<Bson.Document>,
        options?: UpdateOptions,
      ) => updateOneData(name, filter, update, options),

      updateById: (
        {
          _id,
          update,
          options,
          get,
        }: {
          _id: string | ObjectId;
          update: UpdateFilter<Bson.Document>;
          options?: UpdateOptions;
          get?: Projection;
        },
      ) =>
        updateByIdData({
          collection: name,
          _id,
          update,
          options,
          get,
        }),

      delete: (query: Bson.Document, options?: DeleteOptions) =>
        deleteData(name, query, options),

      deleteById: ({
        _id,
        options,
        get,
      }: {
        _id: ObjectId | string;
        options?: DeleteOptions;
        get?: Projection;
      }) =>
        deleteByIdData({
          collection: name,
          _id,
          options,
          get,
        }),

      aggregation: (
        {
          pipline,
          options,
          get,
        }: {
          pipline: AggregatePipeline<Bson.Document>[];
          options?: AggregateOptions | undefined;
          get?: Projection;
        },
      ) => aggregationData({ collection: name, pipline, options, get }),
    };
  };

  return {
    setDb,
    getCollection,
    findData,
    insertOneData,
    updateOneData,
    updateByIdData,
    deleteData,
    deleteByIdData,
    setModel,
  };
};

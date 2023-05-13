/** @jsx h */
import { h } from "https://esm.sh/preact@10.5.15";
import { useRef, useState } from "https://esm.sh/preact@10.5.15/hooks";

export const Page = (
  { schemasObj, actsObj } = { schemasObj: {}, actsObj: {} }
) => {
  const [selectedService, setSelectedService] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [selectedSchema, setSelectedSchema] = useState("");
  const [selectedAct, setSelectedAct] = useState("");
  const [availableSetFields, setAvailableSetFields] = useState(null);
  const [availableGetFields, setAvailableGetFields] = useState(null);
  const [formData, setFormData] = useState({});
  const [headers, setHeaders] = useState<{ [key: string]: string }>({
    Authorization: "",
  });
  const [history, setHistory] = useState<
    { request: string; response: string; id: string }[]
  >([]);
  const [response, setResponse] = useState(null);

  const formRef = useRef<HTMLFormElement>(null);

  const uid = function () {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const handleChange = (event: any) => {
    const { name, value, type, alt } = event.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]:
        type === "number"
          ? Number(value)
          : alt === "array" || alt === "boolean"
          ? JSON.parse(value)
          : value,
    }));
  };

  const deepen = (obj: Record<string, any>) => {
    const result = {};

    // For each object path (property key) in the object
    for (const objectPath in obj) {
      // Split path into component parts
      const parts = objectPath.split(".");

      // Create sub-objects along path as needed
      let target = result;
      while (parts.length > 1) {
        const part = parts.shift();
        target = (target as any)[part!] = (target as any)[part!] || {};
      }

      // Set value at end of path
      (target as any)[parts[0]] = obj[objectPath];
    }

    return result;
  };

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    const details = deepen(formData);

    /* for (const key in formData) { */
    /*   key.split(".").map((k, i, values) => { */
    /*     body = (body as any)[k] = i == values.length - 1 */
    /*       ? (formData as any)[key] */
    /*       : {}; */
    /*   }); */
    /* } */

    const body = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        service: selectedService,
        contents: selectedMethod,
        wants: { model: selectedSchema, act: selectedAct },
        details,
      }),
    };

    const sendedRequest = await fetch("http://localhost:8000/lesan", body);
    const jsonSendedRequest = await sendedRequest.json();

    setResponse(jsonSendedRequest);
    /* event.target.reset(); */
    /* setFormData({}); */

    setHistory((prevHistory) => [
      ...prevHistory,
      {
        request: JSON.stringify(body, null, 2),
        response: JSON.stringify(jsonSendedRequest, null, 2),
        id: uid(),
      },
    ]);
  };

  const renderGetFields = (getField: any, keyName: string, margin: number) => {
    return (
      <div style={{ marginLeft: `${margin + 10}px` }}>
        <h1 style={{ marginLeft: "0" }}>{keyName} :</h1>
        {Object.keys(getField["schema"]).map((childKeys) => {
          return getField["schema"][childKeys].type === "enums" ? (
            <div
              className="input-container"
              style={{ marginLeft: `${margin + 10}px` }}
            >
              <label htmlFor={childKeys}>{childKeys}:</label>
              <input
                placeholder={`${keyName}.${childKeys}`}
                type="number"
                id={`${keyName}.${childKeys}`}
                value={(formData as any)[`get.${keyName}.${childKeys}`]}
                name={`get.${keyName}.${childKeys}`}
                onChange={handleChange}
              />
            </div>
          ) : (
            renderGetFields(
              getField["schema"][childKeys],
              `${keyName}.${childKeys}`,
              margin + 10
            )
          );
        })}
      </div>
    );
  };

  const canShowContent =
    selectedService &&
    selectedMethod &&
    selectedSchema &&
    availableSetFields &&
    availableGetFields;

  const canShowSchema = selectedService && selectedMethod;

  const canShowAct = selectedService && selectedMethod && selectedSchema;

  return (
    <div className="cnt">
      <div className="sidebar">
        <div className="sidebar__section sidebar__section--headers">
          <div className="sidebar__section-heading">set headers</div>
          {Object.entries(headers).map(([objKey, objValue]) => (
            <div className="sidebar__input-double" key={objKey}>
              <input
                placeholder={objKey}
                id={objKey}
                value={objKey}
                name={objKey}
                onChange={(e: any) => {
                  objKey = e.target.value;
                }}
              />
              <input
                placeholder={objValue}
                id={objValue}
                value={objValue}
                name={objValue}
                onChange={(e: any) => {
                  objValue = e.target.value;
                }}
              />
              <button
                className="btn--add"
                onClick={() => {
                  setHeaders((prevHeaders) => ({
                    ...prevHeaders,
                    [objKey]: objValue,
                  }));
                }}
              >
                add +
              </button>
            </div>
          ))}
        </div>
        <div className="sidebar__section sidebar__section--services">
          <div className="sidebar__section-heading">select services</div>
          <select
            className="sidebar__select"
            value={selectedService}
            onChange={(event: any) => {
              setSelectedService(event.target.value);
              setSelectedMethod("");
              setSelectedSchema("");
              setAvailableGetFields(null);
              setAvailableSetFields(null);
              setFormData({});
            }}
          >
            <option value=""></option>
            {Object.keys(actsObj).map((service, index) => (
              <option value={service}>{service}</option>
            ))}
          </select>
        </div>
        <div className="sidebar__section sidebar__section--method">
          <div className="sidebar__section-heading">select method</div>
          <select
            className="sidebar__select"
            value={selectedMethod}
            onChange={(event: any) => {
              setSelectedMethod(event.target.value);
              setSelectedSchema("");
              setAvailableGetFields(null);
              setAvailableSetFields(null);
              setFormData({});
            }}
          >
            <option value=""></option>
            <option value="dynamic">dynamic</option>
            <option value="static">static</option>
          </select>
        </div>
        <div className="sidebar__section sidebar__section--schema">
          <div className="sidebar__section-heading">select schema</div>
          <select
            className="sidebar__select"
            disabled={!canShowSchema}
            value={canShowSchema ? selectedSchema : undefined}
            onChange={(event: any) => {
              setSelectedSchema(event.target.value);
              setAvailableGetFields(null);
              setAvailableSetFields(null);
              setFormData({});
            }}
          >
            <option value=""></option>
            {canShowSchema
              ? Object.keys(
                  (actsObj as any)[selectedService][selectedMethod]
                ).map((schema) => <option value={schema}>{schema}</option>)
              : null}
          </select>
        </div>
        <div className="sidebar__section sidebar__section--act">
          <div className="sidebar__section-heading">select act</div>
          <select
            className="sidebar__select"
            disabled={!canShowAct}
            value={canShowAct ? selectedAct : undefined}
            onChange={(event: any) => {
              const actObj = (actsObj as any)[selectedService][selectedMethod][
                selectedSchema
              ][event.target.value]["validator"]["schema"];

              formRef && formRef.current && formRef.current.reset();
              setSelectedAct(event.target.value);
              setAvailableGetFields(actObj["get"]["schema"]);
              setAvailableSetFields(actObj["set"]["schema"]);
              setFormData({});
            }}
          >
            <option value=""></option>
            {canShowAct
              ? Object.keys(
                  (actsObj as any)[selectedService][selectedMethod][
                    selectedSchema
                  ]
                ).map((schema) => <option value={schema}>{schema}</option>)
              : null}
          </select>
        </div>
      </div>

      {/* TODO: Content and Response Have to Refactor Like Sidebar Section */}
      {canShowContent && (
        <div className="content">
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="">
              <h1> set inputs :</h1>
              <div className="get-container">
                {Object.keys(availableSetFields).map((setField) => (
                  <div className="input-container">
                    <label htmlFor={setField}>{setField}:</label>
                    <input
                      placeholder={setField}
                      id={setField}
                      value={(formData as any)[`set.${setField}`]}
                      name={`set.${setField}`}
                      type={
                        availableSetFields[setField]["type"] === "number"
                          ? "number"
                          : "string"
                      }
                      alt={availableSetFields[setField]["type"]}
                      onChange={handleChange}
                    />
                  </div>
                ))}
              </div>

              <h1> get inputs :</h1>
              <div className="set-container">
                {Object.keys(availableGetFields).map((getField) => {
                  return ((availableGetFields as any)[getField] as any).type ===
                    "enums" ? (
                    <div className="input-container">
                      <label htmlFor={getField}>{getField}:</label>
                      <input
                        placeholder={getField}
                        id={getField}
                        value={(formData as any)[`get.${getField}`]}
                        name={`get.${getField}`}
                        type="number"
                        onChange={handleChange}
                      />
                    </div>
                  ) : (
                    renderGetFields(
                      (availableGetFields as any)[getField],
                      getField,
                      0
                    )
                  );
                })}
              </div>
              <button className="btn btn-submit" type="submit">
                Submit
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="response">
        {response && (
          <div>
            <br />
            <hr />
            <br />
            the response is :
            <br />
            {JSON.stringify(response, null, 2)}
          </div>
        )}

        {history.length > 0 && (
          <div>
            <br />
            <hr />
            <br />
            the req history is :
            <br />
            {history.map((hi) => (
              <div key={hi.id}>
                <section>
                  <span>the request is :</span>
                  <div>{hi.request}</div>
                </section>
                <section>
                  <span>the response is :</span>
                  <div>{hi.response}</div>
                </section>
                <br />
                <hr />
                <br />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

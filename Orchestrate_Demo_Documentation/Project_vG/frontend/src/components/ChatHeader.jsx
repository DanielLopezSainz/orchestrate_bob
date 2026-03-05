import React, { useEffect, useState } from 'react';
import { Header, HeaderName, Tag } from '@carbon/react';

export const ChatHeader = () => {
    const [version, setVersion] = useState('Loading...');

    useEffect(() => {
        fetch('/api/version')
            .then(res => res.json())
            .then(data => setVersion(data.version))
            .catch(() => setVersion('v2.0-STATIC'));
    }, []);

    return (
        <Header aria-label="IBM Watsonx UI">
            <HeaderName href="#" prefix="IBM">
                Watsonx Orchestrate UI Demo
            </HeaderName>
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '1rem' }}>
                <Tag type="green" size="sm" title="Build Version">
                    {version}
                </Tag>
            </div>
        </Header>
    );
};
